const fs = require('fs');
const mysql = require('mysql-ssh');
const writeCSV = require('write-csv')
const secrets = require('../secrets');

const  output_file = './orders.csv'

function fetchOrders(cb) {
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
      client.query(`select
          u.user_email,
          wep.company,
          woi.order_id,
          woi.order_item_name as product_name,
          woim1.meta_value as subtotal,
          wpm.meta_value as discount,
          woim2.meta_value as quantity,
          ewo.order_date,
          wpm2.meta_value as date_completed
        from
          wp_woocommerce_order_items woi
        join wp_postmeta wpm2 on wpm2.post_id = woi.order_id
          and wpm2.meta_key = '_completed_date'
        join wp_postmeta wpm on wpm.post_id = woi.order_id
          and wpm.meta_key = '_cart_discount'
        join wp_woocommerce_order_itemmeta woim1 on woi.order_item_id = woim1.order_item_id
          and woim1.meta_key = '_line_subtotal'
        join wp_woocommerce_order_itemmeta woim2 on woi.order_item_id = woim2.order_item_id
          and woim2.meta_key = '_qty'
        join wp_erp_wc_orders ewo on ewo.order_id = woi.order_id
        join wp_erp_peoples ep on ewo.people_id = ep.id
        join wp_erp_crm_customer_companies eccc on eccc.customer_id = ep.id
        join wp_erp_peoples wep on wep.id = eccc.company_id
        join wp_users u on u.id=ep.user_id
        where 1
        order by wep.company, woi.order_id`, function(err, results, fields) {
        results.map((r) => {
          if (r.date_completed) {
            r.date_completed = new Date(r.date_completed).toISOString();
          }
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

fetchOrders((err, rows) => {
  if (err) {
    console.log("ERROR", err);
  } else {
    console.log(`writing to file ${output_file}`);
    writeCSV(`./${output_file}`, rows);
  }
})
