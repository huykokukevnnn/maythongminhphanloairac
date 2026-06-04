// ImageNet label mapping to Vietnamese waste classification bins

export interface ClassificationResult {
  bin_type: "vô cơ" | "tái chế" | "hữu cơ";
  explanation: string;
}

const EXPLANATIONS = {
  "tái chế": "Đây là thùng rác Tái chế dùng để chứa các nguyên liệu có thể tái sản xuất để giảm thiểu rác thải và bảo vệ môi trường.",
  "hữu cơ": "Đây là thùng rác Hữu cơ dùng để chứa các loại rác dễ phân hủy để ủ thành phân bón cho cây trồng.",
  "vô cơ": "Đây là thùng rác Vô cơ dùng để chứa các loại rác không thể tái chế hoặc phân hủy để mang đi chôn lấp hoặc xử lý an toàn."
};

export function mapLabelToBin(label: string): ClassificationResult {
  const cleanLabel = label.toLowerCase();

  // 1. Organic keywords (Rác hữu cơ)
  const organicKeywords = [
    "apple", "banana", "orange", "lemon", "lime", "strawberry", "grape", "pear", "pineapple",
    "melon", "watermelon", "peach", "plum", "cherry", "mango", "papaya", "fig", "pomegranate",
    "cabbage", "broccoli", "cauliflower", "zucchini", "squash", "cucumber", "eggplant", "mushroom",
    "corn", "maize", "carrot", "onion", "potato", "tomato", "pepper", "bean", "pea", "garlic",
    "ginger", "artichoke", "cardoon", "salad", "vegetable", "fruit",
    "bread", "baguette", "croissant", "pastry", "cookie", "pizza", "hotdog", "cheeseburger",
    "hamburger", "sandwich", "meat", "beef", "pork", "chicken", "fish", "crab", "lobster",
    "shrimp", "egg", "cheese", "carbonara", "custard", "food", "dough"
  ];

  // 2. Recyclable keywords (Rác tái chế)
  const recyclableKeywords = [
    "bottle", "can", "tin", "jar", "carton", "cardboard", "paper", "newspaper", "magazine",
    "book", "notebook", "envelope", "mailbag", "shampoo", "detergent", "tub", "beaker",
    "flask", "beer bottle", "wine bottle", "pop bottle", "soda bottle"
  ];

  // 3. Inorganic / Trash / Disposable keywords (Rác vô cơ)
  const inorganicKeywords = [
    "diaper", "band-aid", "bandage", "syringe", "mask", "styrofoam",
    "ceramic", "porcelain", "plate", "bowl", "cup", "mug", "saucer",
    "plastic bag", "shopping bag", "garbage bag", "baggie", "trash", "waste",
    "sponge", "toilet tissue", "napkin"
  ];

  // Match inorganic first (e.g. plastic bag over just bag, or disposable cup)
  if (inorganicKeywords.some(kw => cleanLabel.includes(kw))) {
    return {
      bin_type: "vô cơ",
      explanation: EXPLANATIONS["vô cơ"]
    };
  }

  // Match organic
  if (organicKeywords.some(kw => cleanLabel.includes(kw))) {
    return {
      bin_type: "hữu cơ",
      explanation: EXPLANATIONS["hữu cơ"]
    };
  }

  // Match recyclable
  if (recyclableKeywords.some(kw => cleanLabel.includes(kw))) {
    return {
      bin_type: "tái chế",
      explanation: EXPLANATIONS["tái chế"]
    };
  }

  // Fallback default: classify as inorganic if we can't recognize it
  return {
    bin_type: "vô cơ",
    explanation: EXPLANATIONS["vô cơ"]
  };
}
