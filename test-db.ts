import { supabase } from './server/services/supabase';

async function run() {
  const { data, error } = await supabase.from('data_sources').select('*').limit(1);
  if (error) {
    console.error('ERRO_SQL:', error.message);
  } else {
    console.log('Success! Tables exist.');
  }
}
run();
