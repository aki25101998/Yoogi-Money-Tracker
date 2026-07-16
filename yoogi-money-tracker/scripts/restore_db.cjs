require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbGJuYWxxbXFrcHF6dm1pZGtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc1NjAzNywiZXhwIjoyMDk5MzMyMDM3fQ.bUImpqofL-aCRim3TzK2N4O5Xup6mrljW8E7al0xtNE';

const supabase = createClient(process.env.VITE_SUPABASE_URL, SERVICE_KEY);

// Order to delete to avoid foreign key violations
const DELETE_ORDER = [
  'transactions',
  'recurring_transactions',
  'debts',
  'installments',
  'wallets',
  'categories',
  'payers',
  'debtors',
  'lenders',
  'ai_memory',
  'abbreviations',
  'settings'
];

// Order to insert to avoid foreign key violations
const INSERT_ORDER = [
  'settings',
  'abbreviations',
  'ai_memory',
  'lenders',
  'debtors',
  'payers',
  'categories',
  'wallets',
  'installments',
  'debts',
  'recurring_transactions',
  'transactions'
];

async function restoreDb() {
  const backupFile = path.join(__dirname, '..', 'db_backup.json');
  
  if (!fs.existsSync(backupFile)) {
    console.error(`Backup file not found at: ${backupFile}`);
    process.exit(1);
  }
  
  console.log(`Reading backup file from: ${backupFile}...`);
  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  
  console.log('\n--- DELETING EXISTING DATA ---');
  for (const table of DELETE_ORDER) {
    console.log(`Deleting all records from ${table}...`);
    // Delete all records where id is not null (which means all records)
    const { error } = await supabase.from(table).delete().neq('id', 'placeholder_impossible_id_123456');
    // Using an alternative approach: delete by selecting id
    const { data: allIds } = await supabase.from(table).select('id');
    if (allIds && allIds.length > 0) {
       const ids = allIds.map(row => row.id);
       // Split into chunks if there are too many (Supabase might complain about URL length)
       const chunkSize = 100;
       for (let i = 0; i < ids.length; i += chunkSize) {
         const chunk = ids.slice(i, i + chunkSize);
         const { error: delErr } = await supabase.from(table).delete().in('id', chunk);
         if (delErr) {
           console.error(`Failed to delete chunk in ${table}:`, delErr.message);
         }
       }
    }
  }
  
  console.log('\n--- RESTORING DATA ---');
  for (const table of INSERT_ORDER) {
    const rows = backupData[table];
    if (!rows || rows.length === 0) {
      console.log(`Skipping ${table}: No records in backup.`);
      continue;
    }
    
    console.log(`Inserting ${rows.length} records into ${table}...`);
    
    // Insert in chunks of 500
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from(table).insert(chunk);
      
      if (error) {
        console.error(`Error inserting chunk into ${table}:`, error.message);
        // We continue trying other tables
      }
    }
  }
  
  console.log('\n✅ Database restore completed successfully!');
}

restoreDb().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
