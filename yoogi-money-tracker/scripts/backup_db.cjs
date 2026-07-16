require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbGJuYWxxbXFrcHF6dm1pZGtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc1NjAzNywiZXhwIjoyMDk5MzMyMDM3fQ.bUImpqofL-aCRim3TzK2N4O5Xup6mrljW8E7al0xtNE';

const supabase = createClient(process.env.VITE_SUPABASE_URL, SERVICE_KEY);

const TABLES = [
  'settings',
  'categories',
  'wallets',
  'payers',
  'debtors',
  'lenders',
  'debts',
  'installments',
  'transactions',
  'recurring_transactions',
  'ai_memory',
  'abbreviations'
];

async function backupDb() {
  console.log('Starting Supabase backup...');
  
  const backupData = {};
  
  for (const table of TABLES) {
    console.log(`Fetching data for table: ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`Error fetching table ${table}:`, error.message);
      process.exit(1);
    }
    
    backupData[table] = data || [];
    console.log(`-> Fetched ${backupData[table].length} records from ${table}.`);
  }
  
  const backupFile = path.join(__dirname, '..', 'db_backup.json');
  
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
  
  console.log(`\n✅ Backup successfully created at: ${backupFile}`);
}

backupDb().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
