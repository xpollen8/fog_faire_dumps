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
      client.query(`select u.user_email, wep.company, woi.order_id, woi.order_item_name as product_name, woim1.meta_value as subtotal, woim2.meta_value as quantity, ewo.order_date
        from wp_woocommerce_order_items woi
        join wp_woocommerce_order_itemmeta woim1 on woi.order_item_id = woim1.order_item_id
        join wp_woocommerce_order_itemmeta woim2 on woi.order_item_id = woim2.order_item_id
        join wp_erp_wc_orders ewo on ewo.order_id = woi.order_id
        join wp_erp_peoples ep on ewo.people_id = ep.id
        join wp_erp_crm_customer_companies eccc on eccc.customer_id = ep.id
        join wp_erp_peoples wep on wep.id = eccc.company_id
        join wp_users u on u.id=ep.user_id
        where 1
        and (woim1.meta_key = '_line_subtotal' and woim2.meta_key = '_qty')
        order by woi.order_id`, function(err, results, fields) {
        results.map((r) => {
          r.order_date = r.order_date.toISOString();
          rows.push({
            ...r,
          });
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
