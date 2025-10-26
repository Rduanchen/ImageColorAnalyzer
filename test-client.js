const axios = require('axios');
const fs =require('fs');
const FormData = require('form-data');
const path = require('path');

// API 伺服器的基本 URL
const API_URL = 'http://localhost:3000/analyze';

/**
 * 執行測試的函式
 * @param {string} imagePath - 圖片的檔案路徑
 * @param {string} apiKey - 您的 API 金鑰
 */
async function runTest(imagePath, apiKey) {
  // --- 1. 參數檢查 ---
  if (!imagePath || !apiKey) {
    console.error('錯誤：請提供圖片路徑和 API 金鑰。');
    console.log('用法: node test-client.js <圖片路徑> <API_KEY>');
    return;
  }

  // 檢查檔案是否存在
  if (!fs.existsSync(imagePath)) {
    console.error(`錯誤：找不到圖片檔案 '${path.resolve(imagePath)}'`);
    return;
  }

  // --- 2. 建立表單資料 ---
  const form = new FormData();
  // 將檔案串流附加到表單
  form.append('image', fs.createReadStream(imagePath));
  // 將金鑰附加到表單
  form.append('key', apiKey);

  console.log(`🚀 正在向 ${API_URL} 發送請求...`);
  console.log(`   - 圖片: ${path.basename(imagePath)}`);
  console.log(`   - API 金鑰: ${'*'.repeat(apiKey.length - 3) + apiKey.slice(-3)}`); // 僅顯示末三碼

  // --- 3. 使用 Axios 發送請求 ---
  try {
    const response = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(), // 這很重要，它會設定正確的 Content-Type 和 boundary
      },
    });

    console.log('\n✅ 請求成功！');
    console.log('伺服器回應狀態:', response.status);
    console.log('回傳資料:');
    console.log(JSON.stringify(response.data, null, 2)); // 美化 JSON 輸出

  } catch (error) {
    console.error('\n❌ 請求失敗！');
    if (error.response) {
      // 伺服器有回應，但狀態碼不是 2xx
      console.error('伺服器回應狀態:', error.response.status);
      console.error('錯誤訊息:', error.response.data);
    } else if (error.request) {
      // 請求已發出，但未收到回應
      console.error('未收到伺服器回應。請確認伺服器是否正在 http://localhost:3000 運行。');
    } else {
      // 設定請求時發生錯誤
      console.error('設定請求時發生錯誤:', error.message);
    }
  }
}

// --- 4. 執行主函式 ---
// 從命令列讀取參數
const imagePathArg = process.argv[2];
const apiKeyArg = process.argv[3];

runTest(imagePathArg, apiKeyArg);