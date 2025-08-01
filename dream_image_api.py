#!/usr/bin/env python3
"""
DreamAI Image Generation API
Stable Diffusion entegrasyonu ile rüya görselleştirme servisi
"""

import os
import io
import base64
import json
import logging
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

import torch
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# Stable Diffusion imports
try:
    from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
    from transformers import CLIPTextModel, CLIPTokenizer
except ImportError:
    print("Diffusers kütüphanesi bulunamadı. Lütfen 'pip install diffusers transformers' komutunu çalıştırın.")
    exit(1)

app = Flask(__name__)
CORS(app)  # CORS desteği

class DreamImageGenerator:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.pipeline = None
        self.load_model()
    
    def load_model(self):
        """Stable Diffusion modelini yükle"""
        try:
            # Hugging Face'den Stable Diffusion modelini yükle
            model_id = "runwayml/stable-diffusion-v1-5"
            
            self.pipeline = StableDiffusionPipeline.from_pretrained(
                model_id,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                safety_checker=None,
                requires_safety_checker=False
            )
            
            # Scheduler'ı optimize et
            self.pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
                self.pipeline.scheduler.config
            )
            
            self.pipeline = self.pipeline.to(self.device)
            
            # Memory optimization
            if self.device == "cuda":
                self.pipeline.enable_memory_efficient_attention()
                self.pipeline.enable_attention_slicing()
            
            print(f"✅ Model başarıyla yüklendi ({self.device})")
            return True
            
        except Exception as e:
            print(f"❌ Model yükleme hatası: {str(e)}")
            return False
    
    def generate_image(self, prompt, width=512, height=512, steps=20, scale=7.5, seed=None):
        """Prompt'tan görsel üret"""
        if not self.pipeline:
            return None, "Model yüklenmedi"
        
        try:
            # Seed ayarla
            if seed is not None:
                torch.manual_seed(seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed(seed)
            
            # Görsel üret
            with torch.no_grad():
                image = self.pipeline(
                    prompt=prompt,
                    width=width,
                    height=height,
                    num_inference_steps=steps,
                    guidance_scale=scale,
                    negative_prompt="blurry, low quality, distorted, deformed, ugly"
                ).images[0]
                
                return image, None
                    
        except Exception as e:
            return None, f"Görsel üretim hatası: {str(e)}"

# Global generator instance
generator = DreamImageGenerator()

@app.route('/health', methods=['GET'])
def health_check():
    """API sağlık kontrolü"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': generator.pipeline is not None,
        'device': generator.device,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/generate', methods=['POST'])
def generate_dream_image():
    """Rüya görseli üret"""
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({'error': 'Prompt gerekli'}), 400
        
        prompt = data['prompt']
        width = data.get('width', 512)
        height = data.get('height', 512)
        steps = data.get('steps', 50)
        scale = data.get('scale', 7.5)
        seed = data.get('seed', None)
        
        # Görsel üret
        image, error = generator.generate_image(
            prompt=prompt,
            width=width,
            height=height,
            steps=steps,
            scale=scale,
            seed=seed
        )
        
        if error:
            return jsonify({'error': error}), 500
        
        if image is None:
            return jsonify({'error': 'Görsel üretilemedi'}), 500
        
        # Base64 encode
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
        
        # Dosya kaydet (opsiyonel)
        filename = f"dream_{uuid.uuid4().hex[:8]}.png"
        filepath = os.path.join('generated_images', filename)
        os.makedirs('generated_images', exist_ok=True)
        image.save(filepath)
        
        return jsonify({
            'success': True,
            'image_base64': img_base64,
            'filename': filename,
            'prompt': prompt,
            'parameters': {
                'width': width,
                'height': height,
                'steps': steps,
                'scale': scale,
                'seed': seed
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Sunucu hatası: {str(e)}'}), 500

@app.route('/dream-prompt', methods=['POST'])
def create_dream_prompt():
    """Rüya analizinden görsel prompt'u oluştur"""
    try:
        data = request.get_json()
        
        if not data or 'dream_text' not in data:
            return jsonify({'error': 'Rüya metni gerekli'}), 400
        
        dream_text = data['dream_text']
        
        # Kapsamlı Türkçe-İngilizce çeviri sistemi
        # Yaygın rüya kelimelerini ve cümle yapılarını çevir
        
        # Önce yaygın rüya ifadelerini kontrol et
        dream_lower = dream_text.lower()
        
        # Yaygın rüya cümle kalıpları
        common_patterns = {
            'yemyeşil bir bahçe': 'a lush green garden with vibrant flowers and trees',
            'büyük bir ev': 'a large beautiful house',
            'mavi deniz': 'a deep blue ocean with crystal clear waters',
            'yüksek dağ': 'a towering mountain with snow-capped peaks',
            'karanlık orman': 'a mysterious dark forest with tall ancient trees',
            'parlak güneş': 'a bright radiant sun shining in the sky',
            'gece gökyüzü': 'a starry night sky with twinkling stars',
            'beyaz bulutlar': 'fluffy white clouds floating in the sky',
            'renkli çiçekler': 'colorful blooming flowers in a meadow',
            'akan su': 'flowing crystal clear water',
            'uçan kuşlar': 'birds flying gracefully in the sky',
            'koşan at': 'a horse galloping freely across fields'
        }
        
        # Önce kalıpları kontrol et
        base_prompt = None
        for turkish_pattern, english_translation in common_patterns.items():
            if turkish_pattern in dream_lower:
                base_prompt = english_translation
                break
        
        # Eğer kalıp bulunamazsa kelime kelime çevir
        if not base_prompt:
            translation_dict = {
                # Temel kelimeler
                'rüyamda': 'in my dream', 'gördüm': 'I saw', 'vardı': 'there was', 'bir': 'a', 'büyük': 'large',
                'küçük': 'small', 'güzel': 'beautiful', 'çirkin': 'ugly', 'yeni': 'new', 'eski': 'old',
                
                # Renkler
                'yemyeşil': 'lush green', 'yeşil': 'green', 'mavi': 'blue', 'kırmızı': 'red', 'sarı': 'yellow',
                'beyaz': 'white', 'siyah': 'black', 'mor': 'purple', 'pembe': 'pink', 'turuncu': 'orange',
                
                # Yerler
                'bahçe': 'garden', 'ev': 'house', 'okul': 'school', 'hastane': 'hospital', 'park': 'park',
                'deniz': 'ocean', 'göl': 'lake', 'dağ': 'mountain', 'orman': 'forest', 'sokak': 'street',
                'şehir': 'city', 'köy': 'village', 'plaj': 'beach', 'nehir': 'river',
                
                # Doğa
                'ağaç': 'tree', 'çiçek': 'flower', 'güneş': 'sun', 'ay': 'moon', 'yıldız': 'star',
                'bulut': 'cloud', 'yağmur': 'rain', 'kar': 'snow', 'rüzgar': 'wind', 'ateş': 'fire',
                'su': 'water', 'toprak': 'earth', 'gökyüzü': 'sky', 'çimen': 'grass',
                
                # Hayvanlar
                'aslan': 'lion', 'kaplan': 'tiger', 'köpek': 'dog', 'kedi': 'cat', 'kuş': 'bird',
                'kartal': 'eagle', 'balık': 'fish', 'at': 'horse', 'koyun': 'sheep', 'inek': 'cow',
                'kelebek': 'butterfly', 'arı': 'bee', 'yılan': 'snake', 'fare': 'mouse',
                
                # İnsanlar
                'adam': 'man', 'kadın': 'woman', 'çocuk': 'child', 'bebek': 'baby', 'yaşlı': 'elderly',
                'anne': 'mother', 'baba': 'father', 'kardeş': 'sibling', 'arkadaş': 'friend',
                
                # Eylemler
                'koşmak': 'running', 'yürümek': 'walking', 'uçmak': 'flying', 'yüzmek': 'swimming',
                'dans': 'dancing', 'şarkı': 'singing', 'uyumak': 'sleeping', 'yemek': 'eating',
                'içmek': 'drinking', 'okumak': 'reading', 'yazmak': 'writing', 'oynamak': 'playing',
                
                # Objeler
                'araba': 'car', 'uçak': 'airplane', 'gemi': 'ship', 'tren': 'train', 'kitap': 'book',
                'masa': 'table', 'sandalye': 'chair', 'yatak': 'bed', 'kapı': 'door', 'pencere': 'window',
                
                # Bağlaçlar
                've': 'and', 'ile': 'with', 'bu': 'this', 'o': 'that', 'çok': 'very', 'daha': 'more',
                'en': 'most', 'gibi': 'like', 'için': 'for', 'olan': 'which', 'gelen': 'coming',
                'giden': 'going', 'yapan': 'doing'
            }
            
            # Kelime kelime çeviri
            words = dream_text.lower().split()
            translated_words = []
            
            for word in words:
                clean_word = word.strip('.,!?;:')
                if clean_word in translation_dict:
                    translated_words.append(translation_dict[clean_word])
                elif len(clean_word) > 1:
                    translated_words.append(clean_word)
            
            base_prompt = ' '.join(translated_words) if translated_words else dream_text
        
        # Görsel kalitesi için detaylar ekle
        visual_enhancements = [
            "highly detailed",
            "photorealistic",
            "8k resolution",
            "professional photography",
            "dramatic lighting",
            "vivid colors",
            "sharp focus",
            "masterpiece"
        ]
        
        # Final prompt'u oluştur
        final_prompt = f"{base_prompt}, {', '.join(visual_enhancements)}"
        
        return jsonify({
            'success': True,
            'prompt': final_prompt,
            'original_dream': dream_text
        })
        
    except Exception as e:
        return jsonify({'error': f'Prompt oluşturma hatası: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 DreamAI Image Generation API başlatılıyor...")
    print(f"📱 Device: {generator.device}")
    print(f"🤖 Model durumu: {'Yüklendi' if generator.pipeline else 'Yüklenemedi'}")
    print("🌐 API Endpoints:")
    print("   GET  /health - Sağlık kontrolü")
    print("   POST /generate - Görsel üretimi")
    print("   POST /dream-prompt - Rüya prompt oluşturma")
    print("\n🔗 Kullanım: http://localhost:5000")
    
    app.run(host='0.0.0.0', port=5000, debug=True)