## SPEC

view all the WooCommerce order items that have been purchased:                                                    
SELECT * FROM `wp_woocommerce_order_items` ORDER BY `order_id` DESC                                                     
                                                                                                                        
(notice both an order_id and and order_item_id)                                                                         
                                                                                                                        
let’s get all the metadata for the MAPPED ‘order_item_id’ of the most recently ordered item:                            
SELECT * FROM `wp_woocommerce_order_itemmeta` WHERE `order_item_id` = 301                                               
                                                                                                                        
cool, now we could have a csv with the columns: order_id, product_id, quantity, and subtotal                            
                                                                                                                        
now let’s search for that most recent ‘order_id’ in the CRM plugin data:                                                
SELECT * FROM `wp_erp_wc_orders` WHERE `order_id` = 594                                                                 
                                                                                                                        
we find a relationship to ‘people_id’ 52                                                                                
SELECT * FROM `wp_erp_peoples` WHERE `id` = 52                                                                          
                                                                                                                        
yay.  Tanya is associated with order item 594, (and has a user_id relationship to 111, “stash" this)                    
                                                                                                                        
SELECT * FROM `wp_erp_crm_customer_companies` WHERE `customer_id` = 52                                                  
yay. Tanya is associated with company_id 146                                                                            
                                                                                                                        
SELECT * FROM `wp_erp_peoples` WHERE `id` = 146 ORDER BY `company` DESC                                                 
yay. Tanya’s company is called “Tanya Bonakdar Gallery"                                                                 
                                                                                                                        
OK, so now we could have a csv with the following columns:                                                              
company_name, people_name, order_id, product_id, quantity, and subtotal                                                 
                                                                                                                        
however, i don’t want the CRM’s  “people_name", i want the real name of the CORE WP user user that made the purchase    
directly…                                                                                                               
                                                                                                                        
aha, from our “stash" above, she is associated with the WP user id: 111                                                 
SELECT * FROM `wp_users` WHERE `ID` = 111                                                                               
                                                                                                                        
ok, so she's actually named rachel, that’s ok, she probably changed her user account details.  let’s pop that user’s    
‘user_email' in the csv  instead of the people_name                                                                     
company_name, user_email, order_id, product_id, quantity, and subtotal                                                  
                                                                                                                        
                                                                                                                        
This took me a couple hrs, i gotta take a break, but at some point i’d like to have a human readable product name       
instead of a product_id!      
