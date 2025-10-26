// 1. 引入所需套件
const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const ColorThief = require('colorthief'); // *** UPDATED ***
const nearestColor = require('nearest-color');
const colorNameList = require('color-name');

// 2. 初始化設定
dotenv.config(); // 載入 .env 檔案中的環境變數
const app = express();
const PORT = process.env.PORT || 3000;

// 根據需求建立顏色名稱查找表
const customColorMap = {
    'Blue': { hex: '#0000FF', chinese: '標準純藍' },
    'Gray': { hex: '#808080', chinese: '中性灰' },
    'White': { hex: '#FFFFFF', chinese: '白色' },
    'Brown': { hex: '#8B4513', chinese: '棕色' },
    'Yellow': { hex: '#FFFF00', chinese: '純黃色' },
    'Orange': { hex: '#FFA500', chinese: '標準橙色' },
    'Black': { hex: '#000000', chinese: '黑色' },
    'Red': { hex: '#FF0000', chinese: '純紅' },
    'Purple': { hex: '#800080', chinese: '標準紫色' },
    'Green': { hex: '#008000', chinese: '標準綠色' },
};

// 準備給 nearest-color 使用的格式
const nearestColorMatcher = nearestColor.from(
    Object.entries(customColorMap).reduce((acc, [name, { hex }]) => {
        acc[name] = hex;
        return acc;
    }, {})
);

// 3. 設定中介軟體 (Middleware)
// 使用 Multer 的 memoryStorage，這樣檔案會被暫存在記憶體中，而不是硬碟
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 限制檔案大小為 10MB
});

// 4. 核心輔助函式
/**
 * 將 RGB 陣列轉換為使用者定義的 Color 物件格式
 * @param {number[]} rgb - [r, g, b] 格式的顏色陣列
 * @returns {object} - 符合需求的 Color 物件
 */
function formatColorObject(rgb) {
    const [r, g, b] = rgb;
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    
    // 使用 nearest-color 找到最接近的自訂顏色
    const nearest = nearestColorMatcher(hex);
    
    // 使用 color-name 找到標準英文名稱
    // color-name 的資料結構是 { "black": "#000000", ... }，需要反轉來查找
    const standardName = Object.keys(colorNameList).find(name => colorNameList[name] === nearest.value) || 'Unknown';

    return {
        rgb: { r, g, b },
        hex: hex,
        engName: nearest.name, // 來自 nearest-color 的自訂名稱
        chineseName: customColorMap[nearest.name]?.chinese || '未知',
        engStanderName: standardName, // 來自 color-name 的標準名稱
    };
}


// 5. 設定路由 (Routes)

// 健康檢查路由
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// 顏色分析路由
app.post('/analyze', upload.single('image'), async (req, res) => {
    try {
        // 權限驗證
        const clientKey = req.body.key;
        if (clientKey !== process.env.API_KEY) {
            return res.status(403).json({ error: '權限拒絕 (Permission Denied)' });
        }

        // 檢查是否有上傳檔案
        if (!req.file) {
            return res.status(400).json({ error: '圖片未上傳 (Image not uploaded)' });
        }
        
        // 從記憶體中的 buffer 讀取圖片進行分析
        const imageBuffer = req.file.buffer;

        // *** UPDATED ***
        // 平行處理 dominant color 和 palette 的分析
        const [dominantRgb, paletteRgb] = await Promise.all([
            ColorThief.getColor(imageBuffer),
            ColorThief.getPalette(imageBuffer, 6) // 取 6 種主要顏色作為調色盤
        ]);

        // 格式化回傳資料
        const dominantColor = formatColorObject(dominantRgb);
        const paletteColors = paletteRgb.map(formatColorObject);
        
        const responseData = {
            dominant: dominantColor,
            palette: paletteColors,
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error during color analysis:', error);
        res.status(500).json({ error: '發生錯誤 (An error occurred during analysis)' });
    }
});

// 處理所有其他未定義的路由
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});


// 6. 啟動伺服器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});