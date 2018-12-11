/*
  4 different CSVs, one for each form_post_id 97,169,64,173
  Each CSV should have the first two columns: date and company, and the rest of the fields should be
  determined by what fun things you find In the “form_value” which is serialized php!  

   Oh and the LIMIT 1 is an important piece as there only should be one result for each company, (the most recent.)

   So, in the end I'll need a csv for each company for each form. Containing the company name, the “form_date” and
   all the associated values. And the form ids are: 97,169,64,173
 */
const fs = require('fs');
const mysql = require('mysql-ssh');
const writeCSV = require('write-csv')
const secrets = require('./secrets');

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

fetchCompanies((err, rows) => {
  if (err) {
    console.log("ERROR", err);
  } else {
    let last = '';
    let data = {};
    rows.map((row,index) => {
      const current = `${row.company}.${row.form_post_id}`;
      if (current == last) {
        console.log("DUPE", index, row.compant);
      } else {
        if (!data[row.form_post_id]) { data[row.form_post_id] = [] }

        data[row.form_post_id].push(row);
      }
      last = current;
    });
    Object.keys(data).map((k) => {
      const filename = k + '.csv';
      writeCSV(`./${filename}`, data[k]);
    });
  }
})
