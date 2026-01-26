
import { localImageService } from './services/localImageService';

async function testDetection() {
  console.log("Checking for local model file...");
  const status = await localImageService.checkModelAvailability();
  console.log("Status:", JSON.stringify(status, null, 2));
  
  if (status.fileExists) {
    console.log("✅ Model file detected successfully!");
  } else {
    console.log("❌ Model file NOT detected. Ensure juggernautXL_ragnarokBy.safetensors is in the root directory.");
  }
}

testDetection();
