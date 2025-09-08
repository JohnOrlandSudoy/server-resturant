// Debug script to test order status update
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOrderStatus() {
  const orderId = '2e2d79c8-9505-4808-837c-3f08a366d5fd';
  
  console.log('=== DEBUGGING ORDER STATUS UPDATE ===');
  console.log('Order ID:', orderId);
  
  try {
    // 1. Check if order exists
    console.log('\n1. Checking if order exists...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.error('Order not found:', orderError);
      return;
    }
    
    console.log('Order found:', {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      customer_name: order.customer_name
    });
    
    // 2. Check table structure
    console.log('\n2. Checking orders table structure...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'orders' });
    
    if (columnsError) {
      console.log('Could not get table structure (this is normal)');
    } else {
      console.log('Table columns:', columns);
    }
    
    // 3. Try to update the order
    console.log('\n3. Attempting to update order status...');
    const updateData = {
      status: 'ready',
      updated_by: order.created_by, // Use the same user who created it
      updated_at: new Date().toISOString()
    };
    
    console.log('Update data:', updateData);
    
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Update failed:', updateError);
      
      // 4. Check RLS policies
      console.log('\n4. Checking RLS policies...');
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_table_policies', { table_name: 'orders' });
      
      if (policiesError) {
        console.log('Could not get RLS policies (this is normal)');
      } else {
        console.log('RLS policies:', policies);
      }
      
    } else {
      console.log('Update successful:', updatedOrder);
      
      // 5. Try to insert into history
      console.log('\n5. Recording status history...');
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: 'ready',
          notes: 'Order ready for pickup',
          updated_by: order.created_by
        });
      
      if (historyError) {
        console.error('History insert failed:', historyError);
      } else {
        console.log('History recorded successfully');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

debugOrderStatus();
