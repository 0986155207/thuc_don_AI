require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting tracking
const apiCallTimestamps = [];
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_CALLS_PER_MINUTE = 15; // Conservative limit

// Rate limiting middleware
function rateLimitMiddleware(req, res, next) {
  const now = Date.now();
  
  // Clean old timestamps
  while (apiCallTimestamps.length > 0 && apiCallTimestamps[0] < now - RATE_LIMIT_WINDOW) {
    apiCallTimestamps.shift();
  }
  
  // Check if exceeded
  if (apiCallTimestamps.length >= MAX_CALLS_PER_MINUTE) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait 1 minute.',
      retryAfter: 60
    });
  }
  
  // Add current timestamp
  apiCallTimestamps.push(now);
  next();
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Khởi tạo Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// === API ENDPOINTS ===

// 1. Gợi ý thực đơn tuần từ AI
app.post('/api/generate-weekly-menu', rateLimitMiddleware, async (req, res) => {
  try {
    const { preferences, budget, familySize, dietaryRestrictions } = req.body;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
Bạn là chuyên gia dinh dưỡng và đầu bếp Việt Nam. Hãy tạo thực đơn cho 1 tuần (7 ngày) với các yêu cầu sau:

Thông tin gia đình:
- Số người: ${familySize || 4} người
- Ngân sách: ${budget || 'tiết kiệm'} (khoảng ${getBudgetRange(budget)} VNĐ/ngày)
- Hạn chế ăn: ${dietaryRestrictions || 'Không có'}
- Sở thích: ${preferences || 'Món ăn truyền thống Việt Nam'}

Yêu cầu:
1. Mỗi ngày có 3 bữa: Sáng, Trưa, Tối
2. Đảm bảo cân bằng dinh dưỡng (protein, carb, chất xơ, vitamin)
3. Đa dạng món ăn, không lặp lại quá nhiều
4. Nguyên liệu dễ tìm, giá cả phải chăng
5. Phù hợp với khẩu vị người Việt
6. Ước tính calories và giá tiền từng món

Format trả về (JSON):
{
  "weekMenu": [
    {
      "day": "Thứ Hai",
      "date": "DD/MM/YYYY",
      "meals": {
        "breakfast": {
          "name": "Tên món",
          "description": "Mô tả ngắn",
          "ingredients": ["nguyên liệu 1", "nguyên liệu 2"],
          "calories": 400,
          "estimatedCost": 15000,
          "prepTime": 20,
          "cookTime": 15,
          "servings": ${familySize || 4},
          "nutrition": {
            "protein": "15g",
            "carbs": "50g",
            "fat": "10g",
            "fiber": "5g"
          }
        },
        "lunch": { ... },
        "dinner": { ... }
      },
      "totalCalories": 1800,
      "totalCost": 80000
    }
  ],
  "weekSummary": {
    "totalCost": 560000,
    "avgCaloriesPerDay": 1800,
    "nutritionBalance": "Cân bằng tốt"
  },
  "shoppingList": {
    "proteins": ["thịt heo 1kg", "cá 500g"],
    "vegetables": ["rau cải 3 bó"],
    "grains": ["gạo 3kg"],
    "others": ["gia vị"]
  }
}

Chỉ trả về JSON hợp lệ, không có text giải thích thêm.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Làm sạch response để lấy JSON
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const menuData = JSON.parse(text);

    res.json({
      success: true,
      data: menuData
    });
    
  } catch (error) {
    console.error('Error generating menu:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Không thể tạo thực đơn. Vui lòng thử lại.'
    });
  }
});

// 2. Tạo hình ảnh món ăn (sử dụng Gemini Pro Vision hoặc mô tả chi tiết)
app.post('/api/generate-dish-image', rateLimitMiddleware, async (req, res) => {
  try {
    const { dishName, description, ingredients } = req.body;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
Tạo mô tả chi tiết hình ảnh cho món ăn Việt Nam: "${dishName}"

Mô tả món: ${description}
Nguyên liệu: ${ingredients ? ingredients.join(', ') : 'Không rõ'}

Hãy mô tả hình ảnh món ăn này một cách chi tiết, hấp dẫn, bao gồm:
- Màu sắc
- Cách bày trí
- Đồ ăn kèm
- Khí cụ phục vụ
- Không gian ăn uống

QUAN TRỌNG: Chỉ trả về JSON hợp lệ, không có text giải thích thêm.

{
  "imageDescription": "Mô tả chi tiết món ăn",
  "aiPrompt": "Vietnamese dish, food photography, professional presentation",
  "presentation": {
    "plating": "Cách bày trí",
    "garnish": "Trang trí",
    "serveWith": "Ăn kèm với"
  },
  "searchKeywords": ["vietnamese", "food", "delicious"]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    console.log('Raw Gemini response:', text);
    
    // Làm sạch response
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Loại bỏ text trước/sau JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }
    
    let imageData;
    try {
      imageData = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Text to parse:', text);
      
      // Fallback: Tạo data mặc định
      imageData = {
        imageDescription: `Món ${dishName} được trình bày đẹp mắt với các nguyên liệu tươi ngon, màu sắc hài hòa và hấp dẫn.`,
        aiPrompt: `Vietnamese ${dishName}, traditional food, beautiful presentation, food photography`,
        presentation: {
          plating: "Bày trí trên đĩa tròn màu trắng",
          garnish: "Rau mùi, hành lá thái nhỏ",
          serveWith: "Rau sống và nước chấm"
        },
        searchKeywords: ["vietnamese", dishName.toLowerCase(), "food"]
      };
    }
    
    // Tạo nhiều nguồn ảnh
    const dishNameEncoded = encodeURIComponent(dishName);
    const aiPrompt = imageData.aiPrompt || `Vietnamese ${dishName}, food photography, professional, appetizing`;
    
    imageData.imageSources = [
      {
        name: 'AI Generated Image',
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(aiPrompt)}?width=800&height=600&nologo=true`,
        description: '🤖 Ảnh được tạo bởi AI dựa trên mô tả món ăn'
      },
      {
        name: 'Unsplash',
        url: `https://source.unsplash.com/800x600/?${dishNameEncoded},vietnamese-food,food`,
        description: '📸 Ảnh thật từ Unsplash'
      },
      {
        name: 'Alternative AI',
        url: `https://image.pollinations.ai/prompt/delicious Vietnamese ${dishNameEncoded} dish, close-up, food photography?width=800&height=600&nologo=true`,
        description: '🎨 Ảnh AI phiên bản 2'
      }
    ];
    
    // URL chính
    imageData.placeholderImage = imageData.imageSources[0].url;
    
    res.json({
      success: true,
      data: imageData
    });
    
  } catch (error) {
    console.error('Error generating image:', error);
    
    // Trả về fallback data thay vì error
    const dishNameEncoded = encodeURIComponent(req.body.dishName || 'Vietnamese Food');
    res.json({
      success: true,
      data: {
        imageDescription: `Món ăn Việt Nam ngon và đẹp mắt`,
        aiPrompt: `Vietnamese food, delicious, beautiful presentation`,
        presentation: {
          plating: "Bày trí đẹp mắt",
          garnish: "Rau mùi trang trí",
          serveWith: "Rau sống"
        },
        searchKeywords: ["vietnamese", "food"],
        imageSources: [
          {
            name: 'AI Generated',
            url: `https://image.pollinations.ai/prompt/Vietnamese food dish?width=800&height=600&nologo=true`,
            description: '🤖 Ảnh AI'
          },
          {
            name: 'Unsplash',
            url: `https://source.unsplash.com/800x600/?${dishNameEncoded},food`,
            description: '📸 Ảnh thật'
          }
        ],
        placeholderImage: `https://image.pollinations.ai/prompt/Vietnamese food?width=800&height=600&nologo=true`
      }
    });
  }
});

// 3. Tạo công thức nấu ăn chi tiết
app.post('/api/generate-recipe', rateLimitMiddleware, async (req, res) => {
  try {
    const { dishName, servings } = req.body;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
Bạn là đầu bếp chuyên nghiệp Việt Nam. Hãy tạo công thức nấu ăn chi tiết cho món: "${dishName}"

Số người ăn: ${servings || 4} người

Yêu cầu:
1. Danh sách nguyên liệu chính xác (khối lượng, số lượng)
2. Các bước chuẩn bị nguyên liệu
3. Các bước nấu nướng chi tiết, dễ hiểu
4. Mẹo nấu ăn từ chuyên gia
5. Cách bảo quản và hâm nóng
6. Biến thể của món ăn
7. Câu trả lời không định dạng Markdown ( dấu * )
Format JSON:
{
  "dishName": "${dishName}",
  "servings": ${servings || 4},
  "prepTime": "20 phút",
  "cookTime": "30 phút",
  "difficulty": "Dễ/Trung bình/Khó",
  "ingredients": [
    {
      "name": "Thịt heo ba chỉ",
      "amount": "300g",
      "notes": "Chọn miếng có nạc và mỡ đều"
    }
  ],
  "preparation": [
    "Sơ chế nguyên liệu bước 1",
    "Bước 2..."
  ],
  "cookingSteps": [
    {
      "step": 1,
      "title": "Ướp thịt",
      "description": "Chi tiết cách ướp",
      "duration": "15 phút",
      "temperature": "Nhiệt độ phòng",
      "tips": "Mẹo hay"
    }
  ],
  "expertTips": [
    "Mẹo 1 từ đầu bếp chuyên nghiệp",
    "Mẹo 2..."
  ],
  "serving": {
    "presentation": "Cách trình bày",
    "accompaniments": ["Rau sống", "Nước chấm"],
    "garnish": "Rau mùi, hành lá"
  },
  "storage": {
    "refrigerator": "Cách bảo quản tủ lạnh",
    "freezer": "Cách bảo quản đông lạnh",
    "reheating": "Cách hâm nóng"
  },
  "variations": [
    {
      "name": "Biến thể 1",
      "changes": "Thay đổi gì"
    }
  ],
  "nutritionInfo": {
    "calories": 450,
    "protein": "25g",
    "carbs": "35g",
    "fat": "20g",
    "fiber": "5g"
  }
}

Chỉ trả về JSON, không có text thêm.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const recipeData = JSON.parse(text);
    
    res.json({
      success: true,
      data: recipeData
    });
    
  } catch (error) {
    console.error('Error generating recipe:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// 7. Điều chỉnh khẩu phần
app.post('/api/adjust-servings', async (req, res) => {
  try {
    const { recipe, newServings } = req.body;
    const originalServings = recipe.servings || 4;
    const ratio = newServings / originalServings;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
Điều chỉnh khẩu phần món ăn từ ${originalServings} người thành ${newServings} người.

Món ăn: ${recipe.dishName || recipe.name}
Nguyên liệu gốc: ${JSON.stringify(recipe.ingredients)}

Hãy tính toán lại khối lượng/số lượng nguyên liệu một cách chính xác.

Format JSON:
{
  "adjustedRecipe": {
    "servings": ${newServings},
    "ingredients": [
      {
        "name": "tên nguyên liệu",
        "amount": "khối lượng mới",
        "notes": "ghi chú nếu có"
      }
    ],
    "adjustmentNotes": "Lưu ý khi điều chỉnh (thời gian nấu có thể thay đổi)"
  }
}

Chỉ trả về JSON.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const adjustedData = JSON.parse(text);
    
    res.json({
      success: true,
      data: adjustedData
    });
    
  } catch (error) {
    console.error('Error adjusting servings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 8. Gợi ý thay thế nguyên liệu
app.post('/api/substitute-ingredient', async (req, res) => {
  try {
    const { ingredient, reason } = req.body;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
Gợi ý nguyên liệu thay thế cho: "${ingredient}"
Lý do: ${reason || 'Không có sẵn'}

Hãy đưa ra 3-5 lựa chọn thay thế phù hợp với món ăn Việt Nam, bao gồm:
- Tên nguyên liệu thay thế
- Tỷ lệ thay thế
- Ảnh hưởng đến hương vị
- Giá cả so sánh

Format JSON:
{
  "originalIngredient": "${ingredient}",
  "substitutes": [
    {
      "name": "Tên thay thế",
      "ratio": "1:1 hoặc tỷ lệ khác",
      "flavorImpact": "Ảnh hưởng đến vị",
      "costComparison": "Rẻ hơn/Tương đương/Đắt hơn",
      "availability": "Dễ tìm/Khó tìm",
      "notes": "Lưu ý khi sử dụng"
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const substituteData = JSON.parse(text);
    
    res.json({
      success: true,
      data: substituteData
    });
    
  } catch (error) {
    console.error('Error finding substitutes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 9. Phân tích dinh dưỡng
app.post('/api/nutrition-analysis', async (req, res) => {
  try {
    const { weekMenu } = req.body;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
Phân tích dinh dưỡng cho thực đơn tuần:

${JSON.stringify(weekMenu, null, 2)}

Hãy đánh giá:
1. Cân bằng dinh dưỡng tổng thể
2. Đủ các nhóm chất dinh dưỡng
3. Phù hợp cho gia đình Việt Nam
4. Đề xuất cải thiện nếu có

Format JSON:
{
  "overallScore": 85,
  "analysis": {
    "protein": {
      "status": "Đủ/Thiếu/Thừa",
      "recommendation": "Khuyến nghị"
    },
    "carbs": { ... },
    "vitamins": { ... },
    "minerals": { ... }
  },
  "recommendations": [
    "Đề xuất 1",
    "Đề xuất 2"
  ],
  "strengths": ["Điểm mạnh 1"],
  "improvements": ["Cần cải thiện 1"]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysisData = JSON.parse(text);
    
    res.json({
      success: true,
      data: analysisData
    });
    
  } catch (error) {
    console.error('Error analyzing nutrition:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// === HELPER FUNCTIONS ===

function getBudgetRange(budget) {

  const ranges = {
    'tiết kiệm': '50,000 - 80,000',
    'trung bình': '80,000 - 120,000',
    'thoải mái': '120,000 - 200,000'
  };
  return ranges[budget] || ranges['tiết kiệm'];
}


// === INGREDIENT RECOGNITION API ===

app.post('/api/analyze-ingredients', rateLimitMiddleware, async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'No image provided'
      });
    }
    
    console.log('📸 Analyzing ingredients from image...');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `Bạn là chuyên gia nhận diện nguyên liệu nấu ăn. Hãy phân tích ảnh này và:

1. Liệt kê TẤT CẢ nguyên liệu thực phẩm nhìn thấy
2. Ước lượng số lượng (nếu có thể)
3. Gợi ý 5 món ăn Việt Nam có thể nấu từ nguyên liệu này

Trả về JSON với format:
{
  "ingredients": [
    {
      "name": "Tên nguyên liệu",
      "quantity": "Số lượng ước tính",
      "icon": "Emoji phù hợp"
    }
  ],
  "suggestedDishes": [
    {
      "name": "Tên món ăn",
      "matchedIngredients": ["nguyên liệu 1", "nguyên liệu 2"],
      "matchPercentage": 80,
      "missingIngredients": ["nguyên liệu còn thiếu"]
    }
  ]
}

Chỉ trả về JSON, không giải thích gì thêm.`;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: image,
          mimeType: 'image/jpeg'
        }
      }
    ]);
    
    const responseText = result.response.text();
    console.log('🤖 Gemini Vision response:', responseText);
    
    // Parse JSON từ response
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Nếu không có JSON, tạo response mặc định
      return res.json({
        success: true,
        ingredients: [],
        suggestedDishes: [],
        message: 'Không nhận diện được nguyên liệu rõ ràng'
      });
    }
    
    const data = JSON.parse(jsonMatch[0]);
    
    res.json({
      success: true,
      ...data
    });
    
    console.log('✅ Ingredients analyzed successfully');
    
  } catch (error) {
    console.error('❌ Error analyzing ingredients:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi phân tích nguyên liệu'
    });
  }
});


// 14. Gợi ý món ăn từ danh sách nguyên liệu (Text)
app.post('/api/suggest-from-text', rateLimitMiddleware, async (req, res) => {
  try {
    const { ingredients } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
    Tôi có các nguyên liệu sau trong tủ lạnh: "${ingredients}"
    
    Hãy gợi ý 3-5 món ăn Việt Nam ngon có thể nấu từ các nguyên liệu này (có thể thêm gia vị cơ bản).
    
    Format JSON:
    {
      "ingredients": [
         {"name": "tên nguyên liệu đã nhập", "quantity": "ước lượng", "icon": "emoji"}
      ],
      "suggestedDishes": [
        {
          "name": "Tên món ăn",
          "matchedIngredients": ["nguyên liệu có sẵn"],
          "matchPercentage": 90,
          "missingIngredients": ["nguyên liệu cần mua thêm"]
        }
      ]
    }
    Chỉ trả về JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    res.json(JSON.parse(text));
    
  } catch (error) {
    console.error('Error suggesting from text:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === START SERVER ===

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
  });
}

module.exports = app;