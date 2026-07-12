const { createClient } = require("@supabase/supabase-js");
const supabase = createClient("https://wjlbnalqmqkpqzvmidkc.supabase.co", "sb_publishable_z4bj2rImApOsky0rBqWBYQ_uzap5bmF");

async function check() {
  const { data } = await supabase.from("transactions").select("amount").limit(1);
  if (data && data.length > 0) {
    console.log("TYPE:", typeof data[0].amount, "VAL:", data[0].amount);
  } else {
    console.log("No data or RLS error");
  }
}
check();
