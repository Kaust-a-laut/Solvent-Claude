import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Try loading from root first
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const apiKey = process.env.SERPER_API_KEY;
console.log('Using API Key:', apiKey ? 'FOUND (' + apiKey.substring(0, 5) + '...)' : 'MISSING');

async function testSearch() {
  if (!apiKey) return;
  try {
    const response = await axios.post('https://google.serper.dev/search', {
      q: 'latest ai news',
      gl: 'us',
      hl: 'en'
    }, {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      }
    });
    console.log('Serper Status:', response.status);
    console.log('Organic Results Count:', response.data.organic?.length || 0);
    if (response.data.organic && response.data.organic.length > 0) {
      console.log('First Result Title:', response.data.organic[0].title);
    } else {
      console.log('Full Response Data:', JSON.stringify(response.data, null, 2));
    }
  } catch (error: any) {
    console.error('Test Failed:', error.response?.data || error.message);
  }
}

testSearch();
