const fs = require('fs');
const mysql = require('mysql-ssh');
const writeCSV = require('write-csv')
const secrets = require('../secrets');

const  output_file = './orders.csv'

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
      console.log("fetching orders..");
      let rows = []
      client.query(`select u.user_email, wep.company, woi.order_id, woi.order_item_name as product_name, woim.meta_key as meta_key, woim.meta_value as meta_value, ewo.order_date
        from wp_woocommerce_order_items woi
        join wp_woocommerce_order_itemmeta woim on woi.order_item_id = woim.order_item_id
        join wp_erp_wc_orders ewo on ewo.order_id = woi.order_id
        join wp_erp_peoples ep on ewo.people_id = ep.id
        join wp_erp_crm_customer_companies eccc on eccc.customer_id = ep.id
        join wp_erp_peoples wep on wep.id = eccc.company_id
        join wp_users u on u.id=ep.user_id
        where 1
        and (woim.meta_key = '_line_subtotal' or woim.meta_key = '_qty')
        order by woi.order_id, meta_key`, function(err, results, fields) {
        let last_order_id;
        let quantity;
        let subtotal;
        let obj = {};
        results.map((r) => {
          //console.log(r);
          if (r.order_id == last_order_id) {
            obj[r.meta_key] = r.meta_value;
            delete r.meta_value
            delete r.meta_key
            subtotal = obj._line_subtotal;
            quantity = obj._qty;
            r.order_date = new Date(r.order_date).toISOString();
            rows.push({
              ...r,
              quantity,
              subtotal
            });
            delete obj.quantity;
            delete obj.subtotal;
          } else {
            obj[r.meta_key] = r.meta_value;
            delete r.meta_value;
            delete r.meta_key
          }
          last_order_id = r.order_id;
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
    console.log(`writing to file ${output_file}`);
    writeCSV(`./${output_file}`, rows);
  }
})
