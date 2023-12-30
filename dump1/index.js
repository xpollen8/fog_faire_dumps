const fs = require('fs');
const mysql = require('mysql-ssh');
const writeCSV = require('write-csv')
const got = require('got');
const secrets = require('../secrets');

function fetchCompanies(cb) {
  mysql.connect(
  {
    host: secrets.ssh.host,
    user: secrets.ssh.username,
    privateKey: fs.readFileSync(secrets.ssh.keyfile),
    timeout: 60000
  },
  {
    host: secrets.mysql.host,
    user: secrets.mysql.username,
    password: secrets.mysql.password,
    database: secrets.mysql.database
  }
  )
  .then(client => {
      console.log("fetching companies");
      let rows = []
      client.query("select company,form_date,form_post_id,form_value from wp_db7_forms f join (select company as company from wp_erp_peoples where last_name = '(company)') c on f.form_value regexp company where form_post_id in(97,169,64,173) order by company, form_post_id, form_date desc;", function(err, results, fields) {
        results.map((r) => {
          rows.push(r);
        })
        mysql.close();
        cb(null, rows);
      })
  })
  .catch(err => {
    cb(err);
  });
}

function parseRow({ form_post_id, form_value } = row)
{
  const arr = form_value.replace(/&#039;/g, "'").replace(/&#047;/g, '\/').split(';').map((r, i) => {
    return r.replace(/^s:[0-9]*:/g, '').replace(/^"/, '').replace(/"$/, '');
  });
  const ret = {};
  arr.map((a,i) => {
    if (!(i % 2)) {
      let keep = false;
      switch (form_post_id) {
        case 169:
          keep = (
            a == 'contact-email' ||
            a == 'person1-name' ||
            a == 'person1-photo-url' ||
            a == 'person2-name' ||
            a == 'person2-photo-url' ||
            a == 'person3-name' ||
            a == 'person3-photo-url' ||
            a == 'person4-name' ||
            a == 'person4-photo-url' ||
            a == 'person5-name' ||
            a == 'person5-photo-url' ||
            a == 'person6-name' ||
            a == 'person6-photo-url' ||
            a == 'person7-name' ||
            a == 'person7-photo-url' ||
            a == 'person8-name' ||
            a == 'person8-photo-url' ||
            a == 'person9-name' ||
            a == 'person9-photo-url' ||
            a == 'person10-name' ||
            a == 'person10-photo-url'
          ) ? true : false;
        break;
        case 64:
          keep = (
            a == 'contact-email' ||
            a == 'shipping-info'
          ) ? true : false;
        break;
        case 97:
          keep = (
            a == 'contact-email' ||
            a == 'file-booth-diagramcfdb7_file'
          ) ? true : false;
        break;
        case 173:
          keep = (
            a == 'contact-email' ||
            a == 'gallery-description' ||
            a == 'image-caption-artist' ||
            a == 'file-catalog-image' ||
            a == 'image-caption-artist' ||
            a == 'image-caption-title' ||
            a == 'image-caption-date' ||
            a == 'image-caption-media' ||
            a == 'image-caption-size' ||
            a == 'image-caption-edition' ||
            a == 'image-caption-credit' ||
            a == 'image-caption-courtesy'
          ) ? true : false;
        break;
      }

      if (a === 'file-booth-diagramcfdb7_file') { a = 'file-booth-diagram' }
      if (keep) { ret[a] = arr[i + 1].replace(/\r?\n/g, '\\n'); }
    }
  });
  return ret
}
const done = {
  headshots: 0,
  headshots_cropped: 0,
}

function grabImage(type, { uri, filename, total }) {
  const ext = uri.split('.')[1];
  filename = filename.trim().replace(/ /g, '_').replace(/'/g, '') + '.' + ext;
  fs.stat(`${type}/${filename}`, (err, stat) => {
    if (err) {
      (async (filename) => {
        const response = await got(uri, { baseUrl: secrets[type].baseurl, encoding: 'binary' })
        fs.writeFile(`${type}/${filename}`, response.body, 'binary', (err) => {
          done[type]++;
          console.log(`DONE ${done[type]}/${total} ${type}/${filename}`);
        });
      })(filename);
    } else {
      done[type]++;
      console.log(`ALREADY ${done[type]}/${total} ${type}/${filename}`);
    }
  })
}

fetchCompanies((err, rows) => {
  if (err) {
    console.log("ERROR", err);
  } else {
    let last = '';
    let data = {};
    const formatYmd = date => date.toISOString().slice(0, 10);
    rows.map((row,index) => {
      const current = `${row.company}.${row.form_post_id}`;
      if (current == last) {
        console.log("OLDER ROW - SKIPPING", index, row.company);
      } else {
        if (!data[row.form_post_id]) { data[row.form_post_id] = [] }

        data[row.form_post_id].push({
          'date': formatYmd(row.form_date),
          'company': row.company,
          ...parseRow(row)
        });
      }
      last = current;
    });
    Object.keys(data).map((k) => {
      const filename = k + '.csv';
      writeCSV(`./${filename}`, data[k]);
      if (k == '169') {
        const images = [];
        data['169'].map((r) => {
          for (var i = 1 ; i <= 20 ; i++) {
            const url_lookup = `person${i}-photo-url`;
            if (r[url_lookup]) {
              images.push({ uri: r[url_lookup], filename: r[`person${i}-name`] });
            }
          }
        });
        console.log(`There are ${images.length} images to download`);

        images.map((image, index) => {
          grabImage('headshots_cropped', { ...image, total: images.length});
          grabImage('headshots', { ...image, total: images.length});
        });
      }
    });
  }
})
