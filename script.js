// DreamAI - AI-Powered Dream Interpreter and Visualizer
// Main JavaScript functionality

console.log('Script.js dosyası yüklendi!');

class DreamAI {
    constructor() {
        this.dreamJournal = JSON.parse(localStorage.getItem('dreamJournal')) || [];
        console.log('Constructor çağrıldı, dreamJournal:', this.dreamJournal);
        this.initializeApp();
    }

    initializeApp() {
        this.bindEvents();
        this.loadJournal();
        this.createStars();
        this.initializeTheme();
    }

    bindEvents() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const dreamInput = document.getElementById('dreamText');
        const saveBtn = document.getElementById('saveToJournal');
        const clearBtn = document.getElementById('clearJournal');
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        const newAnalysisBtn = document.getElementById('newAnalysisBtn');
        const toggleJournal = document.getElementById('toggleJournal');
        const generateImageBtn = document.getElementById('generateImageBtn');

        analyzeBtn.addEventListener('click', () => this.analyzeDream());
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveDream());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearJournal());
        if (themeToggleBtn) themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        if (newAnalysisBtn) newAnalysisBtn.addEventListener('click', () => this.newAnalysis());
        if (toggleJournal) toggleJournal.addEventListener('click', () => this.toggleJournalView());
        // generateImageBtn dinamik olarak oluşturulacak

        // Enter key to analyze
        dreamInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.analyzeDream();
            }
        });
    }

    createStars() {
        const starsContainer = document.querySelector('.stars');
        for (let i = 0; i < 100; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            starsContainer.appendChild(star);
        }
    }

    async analyzeDream() {
        const dreamText = document.getElementById('dreamText').value.trim();
        
        if (!dreamText) {
            this.showError('Lütfen rüyanızı anlatın.');
            return;
        }

        this.showLoading(true);
        this.hideResults();
        
        try {
            // Real AI analysis using Google Gemini
            const analysis = await this.callGemini(dreamText);
            this.displayAnalysis(analysis);
            
        } catch (error) {
            console.error('AI Analysis Error:', error);
            // Fallback to local analysis if API fails
            const fallbackAnalysis = this.generateDreamAnalysis(dreamText);
            this.displayAnalysis(fallbackAnalysis);
            this.showError('AI servisi geçici olarak kullanılamıyor. Yerel analiz kullanıldı.');
        } finally {
            this.showLoading(false);
        }
    }

    async callGemini(dreamText) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('API anahtarı bulunamadı');
        }

        const prompt = `Sen İslami rüya yorumcusu ve manevi danışmansın. İslam'ın rüya yorumu geleneğini, Kuran-ı Kerim'deki rüya anlatılarını ve Hz. Muhammed'in (SAV) rüya yorumlarını temel alarak analiz yapıyorsun. Aşağıdaki rüyayı İslami perspektifle analiz et ve SADECE JSON formatında yanıt ver.

Rüya: "${dreamText}"

Analiz yaparken şunları dikkate al:
- İslami rüya yorumu prensipleri
- Kuran ve hadislerdeki rüya sembolleri
- Manevi mesajlar ve uyarılar
- Hayırlı/şer rüya ayrımı
- Dua ve zikir önerileri

Yanıtın SADECE şu JSON formatında olmalı:
{
  "general": "Rüyanın İslami yorumu, manevi anlamı ve hayırlı/şer olma durumu (3-4 cümle, İslami kavramlar kullan)",
  "symbols": [{"symbol": "rüyada_geçen_sembol", "meaning": "İslami perspektiften detaylı anlam"}],
  "emotions": [{"emotion": "tespit_edilen_duygu", "intensity": 85, "keywords": ["rüyadan_kelimeler"]}],
  "suggestions": ["İslami öneriler ve dualar", "Manevi tavsiyeler", "Yapılması gerekenler"]
}

ÖNEMLİ: Sadece JSON yanıtı ver, başka metin ekleme. Türkçe ve İslami terminoloji kullan.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        try {
            const analysis = JSON.parse(aiResponse);
            return analysis;
        } catch (parseError) {
            // If JSON parsing fails, extract information manually
            return this.parseAIResponse(aiResponse, dreamText);
        }
    }

    getApiKey() {
        // Check for API key in localStorage first
        let apiKey = localStorage.getItem('gemini_api_key');
        
        if (!apiKey) {
            // Use the provided API key
            apiKey = 'AIzaSyBVw74strP2XugSGV2AMGF6-Y2HRDQVNWs';
            localStorage.setItem('gemini_api_key', apiKey);
            this.showSuccess('Gemini API anahtarı kaydedildi!');
        }
        
        return apiKey;
    }

    parseAIResponse(aiResponse, dreamText) {
        // Try to extract JSON from the response
        try {
            // Look for JSON pattern in the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const parsed = JSON.parse(jsonStr);
                return parsed;
            }
        } catch (e) {
            console.log('JSON extraction failed:', e);
        }
        
        // Fallback to local analysis
        const keywords = this.extractKeywords(dreamText);
        
        return {
            general: 'AI servisi geçici olarak kullanılamıyor. Yerel analiz kullanılıyor.',
            symbols: this.identifySymbols(dreamText),
            emotions: this.analyzeEmotions(dreamText),
            suggestions: this.generateSuggestions(this.analyzeEmotions(dreamText), this.identifySymbols(dreamText))
        };
    }

    generateDreamAnalysis(dreamText) {
        const keywords = this.extractKeywords(dreamText);
        const emotions = this.analyzeEmotions(dreamText);
        const symbols = this.identifySymbols(dreamText);
        const dreamSummary = this.generateDreamSummary(dreamText, keywords, symbols);
        
        return {
            general: this.generateDetailedInterpretation(dreamText, keywords, emotions, symbols, dreamSummary),
            symbols: symbols,
            emotions: emotions,
            suggestions: this.generateSuggestions(emotions, symbols)
        };
    }

    extractKeywords(text) {
        const commonWords = ['ve', 'bir', 'bu', 'o', 'ben', 'sen', 'biz', 'onlar', 'için', 'ile', 'gibi', 'çok', 'daha', 'en', 'de', 'da', 'ki', 'mi', 'mu', 'mı', 'mü'];
        return text.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 2 && !commonWords.includes(word))
            .slice(0, 10);
    }

    analyzeEmotions(text) {
        const emotionKeywords = {
            mutluluk: ['mutlu', 'sevinç', 'neşe', 'gülümseme', 'kahkaha', 'eğlence'],
            korku: ['korku', 'kabus', 'dehşet', 'panik', 'endişe', 'kaygı'],
            üzüntü: ['üzgün', 'ağlamak', 'hüzün', 'keder', 'melankolik'],
            öfke: ['öfke', 'sinir', 'kızgın', 'hiddet', 'kavga'],
            aşk: ['aşk', 'sevgi', 'romantik', 'kalp', 'öpücük'],
            merak: ['merak', 'keşif', 'araştırma', 'soru', 'bilinmeyen']
        };

        const emotions = [];
        const lowerText = text.toLowerCase();
        const textLength = text.length;
        
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            const matches = keywords.filter(keyword => lowerText.includes(keyword));
            if (matches.length > 0) {
                // Daha dengeli yüzdelik hesaplama
                let baseIntensity = Math.min(matches.length * 15, 60); // Temel yoğunluk
                
                // Metin uzunluğuna göre ayarlama
                if (textLength < 100) {
                    baseIntensity += 20; // Kısa metinlerde yoğunluğu artır
                } else if (textLength > 300) {
                    baseIntensity += 10; // Uzun metinlerde hafif artır
                }
                
                // Kelime tekrarlarını kontrol et
                let totalMatches = 0;
                keywords.forEach(keyword => {
                    const regex = new RegExp(keyword, 'gi');
                    const keywordMatches = (lowerText.match(regex) || []).length;
                    totalMatches += keywordMatches;
                });
                
                // Tekrar sayısına göre ek puan
                if (totalMatches > matches.length) {
                    baseIntensity += Math.min((totalMatches - matches.length) * 5, 20);
                }
                
                emotions.push({
                    emotion: emotion,
                    intensity: Math.min(Math.max(baseIntensity, 25), 95), // 25-95 arası sınırla
                    keywords: matches
                });
            }
        }

        // Duyguları yoğunluğa göre sırala
        emotions.sort((a, b) => b.intensity - a.intensity);
        
        // Toplam yüzdeyi 100'e normalize et
        if (emotions.length > 1) {
            const totalIntensity = emotions.reduce((sum, emotion) => sum + emotion.intensity, 0);
            if (totalIntensity > 100) {
                const factor = 100 / totalIntensity;
                emotions.forEach(emotion => {
                    emotion.intensity = Math.round(emotion.intensity * factor);
                });
            }
        }

        return emotions.length > 0 ? emotions : [{
            emotion: 'nötr',
            intensity: 50,
            keywords: ['genel']
        }];
    }

    identifySymbols(text) {
        const islamicSymbolMeanings = {
            'su': 'İslam\'da temizlik, abdest, rahmet ve bereket sembolü',
            'nur': 'Allah\'ın nuru, hidayet, iman ve maneviyat',
            'kitap': 'Kuran-ı Kerim, ilim, hidayet ve Allah\'ın kelamı',
            'mescit': 'İbadet, Allah\'a yakınlık, cemaat ve maneviyat',
            'peygamber': 'Şefaat, hidayet, müjde ve manevi rehberlik',
            'melek': 'Allah\'ın elçileri, koruma, rahmet ve bereket',
            'cennet': 'Mükafat, Allah\'ın rızası, ebedi mutluluk',
            'cehennem': 'Uyarı, tövbe çağrısı, günah ve azap',
            'dua': 'Allah\'a yalvarış, ibadet, maneviyat',
            'ateş': 'İmtihan, temizlenme veya azap uyarısı',
            'uçmak': 'Manevi yükseliş, Allah\'a yakınlaşma',
            'ev': 'Aile, huzur, bereket ve güvenlik',
            'yılan': 'Düşman, fitne veya nefis ile mücadele',
            'köpek': 'Sadakat, koruma veya necaset uyarısı',
            'kedi': 'Temizlik, bereket ve ev huzuru',
            'araba': 'Hayat yolculuğu, takdir ve kader',
            'okul': 'İlim, öğrenme ve manevi gelişim',
            'ölüm': 'Ahiret hatırlatması, tövbe ve hazırlık',
            'bebek': 'Bereket, yeni başlangıç ve masumiyet',
            'para': 'Rızık, bereket veya dünya sevgisi uyarısı',
            'ay': 'İslami takvim, hac, ramazan ve zaman',
            'güneş': 'Hidayet, nur ve Allah\'ın rahmeti'
        };

        const foundSymbols = [];
        const lowerText = text.toLowerCase();
        
        for (const [symbol, meaning] of Object.entries(islamicSymbolMeanings)) {
            if (lowerText.includes(symbol)) {
                foundSymbols.push({ symbol, meaning });
            }
        }

        return foundSymbols;
    }

    generateDreamSummary(dreamText, keywords, symbols) {
        const sentences = dreamText.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const mainEvents = [];
        const characters = [];
        const locations = [];
        
        // Ana olayları tespit et
        const actionWords = ['gördüm', 'yaptım', 'gittim', 'geldi', 'oldu', 'konuştum', 'koştum', 'uçtum', 'düştüm', 'çıktım', 'girdi'];
        sentences.forEach(sentence => {
            const lowerSentence = sentence.toLowerCase();
            if (actionWords.some(action => lowerSentence.includes(action))) {
                mainEvents.push(sentence.trim());
            }
        });
        
        // Karakterleri tespit et
        const characterWords = ['anne', 'baba', 'kardeş', 'arkadaş', 'öğretmen', 'doktor', 'imam', 'hoca', 'çocuk', 'adam', 'kadın', 'kişi'];
        characterWords.forEach(char => {
            if (dreamText.toLowerCase().includes(char)) {
                characters.push(char);
            }
        });
        
        // Mekanları tespit et
        const locationWords = ['ev', 'okul', 'mescit', 'hastane', 'park', 'sokak', 'deniz', 'dağ', 'orman', 'şehir', 'köy'];
        locationWords.forEach(loc => {
            if (dreamText.toLowerCase().includes(loc)) {
                locations.push(loc);
            }
        });
        
        let summary = "**Rüya Özeti:** ";
        
        if (mainEvents.length > 0) {
            summary += `Bu rüyada ${mainEvents.length > 1 ? 'birkaç önemli olay' : 'önemli bir olay'} yaşandı. `;
        }
        
        if (characters.length > 0) {
            summary += `Rüyada ${characters.slice(0, 3).join(', ')} gibi kişiler yer aldı. `;
        }
        
        if (locations.length > 0) {
            summary += `Olaylar ${locations.slice(0, 2).join(' ve ')} gibi mekanlarda geçti. `;
        }
        
        if (symbols.length > 0) {
            summary += `Rüyada ${symbols.length} önemli İslami sembol tespit edildi. `;
        }
        
        summary += "Bu rüyanın detaylı analizi aşağıdaki gibidir:";
        
        return summary;
    }

    generateDetailedInterpretation(dreamText, keywords, emotions, symbols, dreamSummary) {
        let interpretation = dreamSummary + "\n\n";
        
        // İslami rüya yorumu giriş
        const islamicIntros = [
            "**İslami Rüya Yorumu Perspektifinden:**\n\nHz. Yusuf'un (AS) rüya yorumu geleneğinden ilham alarak, bu rüyanın manevi boyutlarını inceleyelim.",
            "**Dini Açıdan Değerlendirme:**\n\nPeygamber Efendimiz (SAV) 'Mümin'in rüyası nübüvvetin kırk altıda biridir' buyurmuştur. Bu ışıkta rüyanızı analiz edelim.",
            "**İslami Rüya Tahlili:**\n\nİslam'da rüyalar üç türlüdür: Rahman'dan, nefisten veya şeytandan. Bu rüyanın işaretlerini değerlendirelim."
        ];
        
        interpretation += islamicIntros[Math.floor(Math.random() * islamicIntros.length)] + "\n\n";
        
        // Rüya içeriği analizi
        interpretation += "**Rüya İçeriği Analizi:**\n";
        
        // Ana temalar
        const themes = this.identifyThemes(dreamText, keywords);
        if (themes.length > 0) {
            interpretation += `Bu rüyada ${themes.join(', ')} temaları öne çıkmaktadır. `;
        }
        
        // Sembolik analiz
        if (symbols.length > 0) {
            interpretation += `\n\n**Sembolik Yorumlama:**\n`;
            interpretation += `Rüyanızda tespit edilen ${symbols.length} İslami sembol, özel anlamlar taşımaktadır. `;
            
            symbols.slice(0, 3).forEach(symbol => {
                interpretation += `${symbol.symbol.charAt(0).toUpperCase() + symbol.symbol.slice(1)} sembolü, ${symbol.meaning.toLowerCase()} anlamına gelir ve bu durum sizin manevi yolculuğunuzda önemli bir işaret olabilir. `;
            });
        }
        
        // Duygusal analiz
        if (emotions.length > 0) {
            interpretation += `\n\n**Duygusal Boyut:**\n`;
            const dominantEmotion = emotions[0].emotion;
            const emotionAnalysis = {
                'korku': 'Rüyanızdaki korku duygusu, Allah korkusu (havf) olabilir veya günah işlemekten sakınmanız gerektiğini hatırlatıyor olabilir. Bu, aynı zamanda nefsinizle mücadele etmeniz gerektiğinin bir işareti de olabilir.',
                'mutluluk': 'Bu sevinç ve mutluluk, Allah\'ın rızasını kazandığınızın, hayırlı işler yaptığınızın müjdesi olabilir. İslam\'da müjdeli rüyalar, kişinin dini hayatında olumlu gelişmelerin habercisidir.',
                'üzüntü': 'Rüyanızdaki hüzün, tövbe etmeniz gerektiğini, dünyaya fazla bağlandığınızı veya ahiret hazırlığınızı gözden geçirmeniz gerektiğini hatırlatıyor olabilir.',
                'öfke': 'Bu öfke duygusu, haksızlığa karşı duruşunuzu, adalet arayışınızı veya nefsinizle mücadelenizi temsil ediyor olabilir. İslam\'da haklı öfke, iman gereğidir.',
                'aşk': 'Bu sevgi duygusu, Allah ve Resulü\'ne olan muhabbetinizi, dini değerlere bağlılığınızı yansıtıyor olabilir.',
                'merak': 'Merak duygunuz, ilim arayışınızı, dini konularda derinleşme isteğinizi gösteriyor olabilir.'
            };
            
            interpretation += emotionAnalysis[dominantEmotion] || `${dominantEmotion} duygularınız, manevi durumunuzla ilgili önemli işaretler taşıyor ve bu duyguların kaynağını araştırmanız faydalı olacaktır.`;
        }
        
        // Manevi mesaj
        interpretation += `\n\n**Manevi Mesaj:**\n`;
        interpretation += this.generateSpiritualMessage(dreamText, symbols, emotions);
        
        // Hayata yansıma
        interpretation += `\n\n**Hayatınıza Yansıması:**\n`;
        interpretation += this.generateLifeReflection(symbols, emotions, keywords);
        
        return interpretation;
    }

    identifyThemes(dreamText, keywords) {
        const themeKeywords = {
            'aile': ['anne', 'baba', 'kardeş', 'çocuk', 'eş', 'akraba'],
            'ibadet': ['namaz', 'dua', 'mescit', 'kuran', 'hac', 'oruç'],
            'yolculuk': ['yol', 'araba', 'uçak', 'gemi', 'seyahat'],
            'eğitim': ['okul', 'öğretmen', 'kitap', 'ders', 'sınav'],
            'doğa': ['deniz', 'dağ', 'orman', 'nehir', 'ağaç', 'çiçek'],
            'korku': ['kaçmak', 'saklanmak', 'korku', 'tehlike'],
            'başarı': ['kazanmak', 'başarmak', 'ödül', 'sevinç']
        };
        
        const themes = [];
        const lowerText = dreamText.toLowerCase();
        
        for (const [theme, words] of Object.entries(themeKeywords)) {
            if (words.some(word => lowerText.includes(word))) {
                themes.push(theme);
            }
        }
        
        return themes;
    }

    generateSpiritualMessage(dreamText, symbols, emotions) {
        const messages = [
            "Bu rüya, Allah'ın size gönderdiği bir rehberlik işareti olabilir. Dini hayatınızı gözden geçirmeniz ve ibadetlerinizi artırmanız gerekebilir.",
            "Rüyanız, manevi gelişiminizde yeni bir aşamaya geçtiğinizi gösteriyor olabilir. Allah'a daha çok yaklaşma zamanı gelmiş olabilir.",
            "Bu rüya, hayatınızdaki bazı kararları İslami değerlere göre yeniden değerlendirmeniz gerektiğini işaret ediyor olabilir."
        ];
        
        let message = messages[Math.floor(Math.random() * messages.length)];
        
        if (symbols.length > 2) {
            message += " Rüyanızdaki çok sayıda İslami sembol, Allah'ın size özel bir ilgi gösterdiğini ve bu mesajları dikkatlice değerlendirmeniz gerektiğini gösteriyor.";
        }
        
        return message;
    }

    generateLifeReflection(symbols, emotions, keywords) {
        let reflection = "Bu rüyanın hayatınıza yansımaları şu şekilde olabilir: ";
        
        if (emotions.some(e => e.emotion === 'korku')) {
            reflection += "Korkularınızla yüzleşme ve Allah'a güvenme konusunda çalışmanız gerekebilir. ";
        }
        
        if (emotions.some(e => e.emotion === 'mutluluk')) {
            reflection += "Hayatınızdaki olumlu gelişmeler devam edecek, ancak şükretmeyi unutmamalısınız. ";
        }
        
        if (symbols.some(s => s.symbol === 'su')) {
            reflection += "Temizlik ve maneviyat konularında yeni başlangıçlar yapabilirsiniz. ";
        }
        
        if (symbols.some(s => s.symbol === 'kitap' || s.symbol === 'okul')) {
            reflection += "İlim öğrenme ve dini bilgilerinizi artırma konusunda fırsatlar çıkabilir. ";
        }
        
        reflection += "Bu rüyayı bir uyarı veya müjde olarak değerlendirip, hayatınızda gerekli değişiklikleri yapmanız önemlidir.";
        
        return reflection;
    }



    generateSuggestions(emotions, symbols) {
        const suggestions = [
            "Rüyanız için Allah\'a şükretmeli ve hayırlı olması için dua etmelisiniz",
            "Sabah namazından sonra istiğfar çekerek Allah\'tan bağışlanma dileyin",
            "Rüya yorumu için bilgili bir İslam alimi ile görüşebilirsiniz",
            "Kötü rüyalar gördüğünüzde \'A\'uzubillahi mine\'ş-şeytani\'r-racim\' deyin",
            "Düzenli Kuran okuyarak kalbinizi nurlandırın",
            "Beş vakit namazınızı aksatmayın ve Allah\'a yakınlaşın",
            "Sadaka vererek rüyanızın hayırlı olması için vesile oluşturun"
        ];

        // Duygu durumuna göre özel öneriler
        if (emotions.some(e => e.emotion === 'korku' || e.emotion === 'kaygı')) {
            suggestions.unshift("Ayetel Kürsi okuyarak Allah\'ın korumasına sığının");
            suggestions.unshift("Tövbe istiğfar ederek Allah\'tan af dileyin");
        }

        if (emotions.some(e => e.emotion === 'üzüntü' || e.emotion === 'melankoli')) {
            suggestions.unshift("\'Hasbünallahu ve ni\'mel vekil\' zikri çekerek Allah\'a tevekkül edin");
            suggestions.unshift("Sabır duası okuyarak Allah\'tan sabır dileyin");
        }

        if (emotions.some(e => e.emotion === 'mutluluk' || e.emotion === 'sevinç')) {
            suggestions.unshift("Bu müjdeli rüya için Allah\'a hamd edin ve şükredin");
        }

        return suggestions.slice(0, 4);
    }

    displayAnalysis(analysis) {
        console.log('displayAnalysis çağrıldı! Analysis:', analysis);
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
        
        // General interpretation
        document.getElementById('generalInterpretation').textContent = analysis.general;
        
        // Symbols
        const symbolsList = document.getElementById('symbolsList');
        if (symbolsList) {
            symbolsList.innerHTML = '';
            if (analysis.symbols && analysis.symbols.length > 0) {
                analysis.symbols.forEach(symbol => {
                    const symbolDiv = document.createElement('div');
                    symbolDiv.className = 'symbol-item';
                    symbolDiv.innerHTML = `
                        <div class="symbol-icon"><i class="fas fa-gem"></i></div>
                        <div class="symbol-content">
                            <strong>${symbol.symbol}</strong>
                            <p>${symbol.meaning}</p>
                        </div>
                    `;
                    symbolsList.appendChild(symbolDiv);
                });
            } else {
                symbolsList.innerHTML = '<p class="no-symbols">Bu rüyada belirgin semboller tespit edilmedi.</p>';
            }
        }
        
        // Emotions
        const emotionalAnalysis = document.getElementById('emotionalAnalysis');
        if (emotionalAnalysis) {
            emotionalAnalysis.innerHTML = '';
            if (analysis.emotions && analysis.emotions.length > 0) {
                analysis.emotions.forEach(emotion => {
                    const emotionDiv = document.createElement('div');
                    emotionDiv.className = 'emotion-item';
                    emotionDiv.innerHTML = `
                        <div class="emotion-bar">
                            <div class="emotion-label">${emotion.emotion}</div>
                            <div class="emotion-progress">
                                <div class="emotion-fill" style="width: ${emotion.intensity}%"></div>
                            </div>
                            <div class="emotion-value">${emotion.intensity}%</div>
                        </div>
                    `;
                    emotionalAnalysis.appendChild(emotionDiv);
                });
            }
        }
        

        
        // Suggestions
        const suggestions = document.getElementById('suggestions');
        if (suggestions) {
            suggestions.innerHTML = '';
            if (analysis.suggestions && analysis.suggestions.length > 0) {
                analysis.suggestions.forEach((suggestion, index) => {
                    const suggestionDiv = document.createElement('div');
                    suggestionDiv.className = 'suggestion-item';
                    suggestionDiv.innerHTML = `
                        <div class="suggestion-icon"><i class="fas fa-lightbulb"></i></div>
                        <div class="suggestion-text">${suggestion}</div>
                    `;
                    suggestions.appendChild(suggestionDiv);
                });
            }
        }
        
        // Store current analysis for saving
        this.currentAnalysis = {
            dream: document.getElementById('dreamText').value,
            title: document.getElementById('dreamTitle').value || 'Başlıksız Rüya',
            mood: document.getElementById('dreamMood').value,
            analysis: analysis,
            date: new Date().toISOString()
        };
        
        // Görsel üretim butonunu göster
        this.showImageGenerationButton();
    }





    saveDream() {
        if (!this.currentAnalysis) {
            this.showError('Kaydetmek için önce bir rüya analizi yapın.');
            return;
        }
        
        this.dreamJournal.unshift(this.currentAnalysis);
        localStorage.setItem('dreamJournal', JSON.stringify(this.dreamJournal));
        this.loadJournal();
        this.showSuccess('Rüya günlüğünüze kaydedildi!');
    }

    loadJournal() {
        console.log('loadJournal çağrıldı');
        const journalEntries = document.getElementById('journalEntries');
        const totalDreams = document.getElementById('totalDreams');
        const mostCommonMood = document.getElementById('mostCommonMood');
        const journalStreak = document.getElementById('journalStreak');
        
        if (!journalEntries) return;
        
        // Update stats
        if (totalDreams) totalDreams.textContent = this.dreamJournal.length;
        
        if (this.dreamJournal.length === 0) {
            journalEntries.innerHTML = `
                <div class="empty-journal">
                    <i class="fas fa-moon"></i>
                    <p>Henüz rüya günlüğünüzde kayıt yok. İlk rüyanızı analiz edin!</p>
                </div>
            `;
            if (mostCommonMood) mostCommonMood.textContent = '-';
            if (journalStreak) journalStreak.textContent = '0';
            return;
        }
        
        // Calculate most common mood
        if (mostCommonMood) {
            const moods = this.dreamJournal.map(entry => entry.mood).filter(Boolean);
            const moodCounts = {};
            moods.forEach(mood => moodCounts[mood] = (moodCounts[mood] || 0) + 1);
            const topMood = Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b, '-');
            mostCommonMood.textContent = topMood;
        }
        
        // Calculate streak (simplified)
        if (journalStreak) {
            journalStreak.textContent = Math.min(this.dreamJournal.length, 7);
        }
        
        journalEntries.innerHTML = '';
        
        this.dreamJournal.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'journal-entry';
            
            const date = new Date(entry.date).toLocaleDateString('tr-TR');
            const preview = entry.dream.substring(0, 100) + (entry.dream.length > 100 ? '...' : '');
            const title = entry.title || 'Başlıksız Rüya';
            
            // Analiz sonuçlarını hazırla
            let analysisHtml = '';
            if (entry.analysis) {
                // Genel yorum
                if (entry.analysis.general) {
                    analysisHtml += `
                        <div class="entry-analysis">
                            <h5><i class="fas fa-brain"></i> Rüya Yorumu:</h5>
                            <p class="analysis-text">${entry.analysis.general}</p>
                        </div>
                    `;
                }
                
                // Semboller
                if (entry.analysis.symbols && entry.analysis.symbols.length > 0) {
                    const symbolsText = entry.analysis.symbols.map(s => s.symbol || s).join(', ');
                    analysisHtml += `
                        <div class="entry-symbols">
                            <h5><i class="fas fa-gem"></i> Semboller:</h5>
                            <p class="symbols-text">${symbolsText}</p>
                        </div>
                    `;
                }
                
                // Duygular
                if (entry.analysis.emotions && entry.analysis.emotions.length > 0) {
                    const emotionsText = entry.analysis.emotions.map(e => e.emotion || e).join(', ');
                    analysisHtml += `
                        <div class="entry-emotions">
                            <h5><i class="fas fa-heart"></i> Duygular:</h5>
                            <p class="emotions-text">${emotionsText}</p>
                        </div>
                    `;
                }
                
                // Öneriler
                if (entry.analysis.suggestions && entry.analysis.suggestions.length > 0) {
                    const suggestionsText = entry.analysis.suggestions.slice(0, 2).join(' • ');
                    analysisHtml += `
                        <div class="entry-suggestions">
                            <h5><i class="fas fa-lightbulb"></i> Öneriler:</h5>
                            <p class="suggestions-text">${suggestionsText}</p>
                        </div>
                    `;
                }
            }
            
            entryDiv.innerHTML = `
                <div class="entry-header">
                    <h4 class="entry-title">${title}</h4>
                    <div class="entry-meta">
                        <span class="entry-date"><i class="fas fa-calendar"></i> ${date}</span>
                        <button class="delete-entry" onclick="dreamWeaver.deleteEntry(${index})" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="entry-preview">${preview}</div>
                <div class="entry-mood">
                    <span class="mood-label">Rüya Sonrası His:</span>
                    <span class="mood-value">${entry.mood || 'Belirtilmemiş'}</span>
                </div>
                ${analysisHtml}
            `;
            
            journalEntries.appendChild(entryDiv);
        });
    }

    deleteEntry(index) {
        this.dreamJournal.splice(index, 1);
        localStorage.setItem('dreamJournal', JSON.stringify(this.dreamJournal));
        this.loadJournal();
    }

    clearJournal() {
        if (confirm('Tüm rüya günlüğünüzü silmek istediğinizden emin misiniz?')) {
            this.dreamJournal = [];
            localStorage.removeItem('dreamJournal');
            this.loadJournal();
            this.showSuccess('Rüya günlüğü temizlendi.');
        }
    }

    showLoading(show) {
        const loadingSection = document.getElementById('loadingSection');
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        if (loadingSection) {
            loadingSection.style.display = show ? 'block' : 'none';
        }
        if (analyzeBtn) {
            analyzeBtn.disabled = show;
        }
        
        if (show) {
            this.startLoadingAnimation();
        }
    }

    startLoadingAnimation() {
        const loadingTexts = [
            'Semboller yorumlanıyor...',
            'Duygusal analiz yapılıyor...',
            'AI rüyanızı çözümleyiyor...',
            'Görsel temsil oluşturuluyor...',
            'Son dokunuşlar yapılıyor...'
        ];
        
        let currentIndex = 0;
        const loadingText = document.getElementById('loadingText');
        const progressBar = document.getElementById('progressBar');
        
        const interval = setInterval(() => {
            if (currentIndex < loadingTexts.length) {
                if (loadingText) loadingText.textContent = loadingTexts[currentIndex];
                if (progressBar) progressBar.style.width = `${(currentIndex + 1) * 20}%`;
                currentIndex++;
            } else {
                clearInterval(interval);
            }
        }, 800);
    }

    hideResults() {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }



     newAnalysis() {
         // Clear form
         document.getElementById('dreamText').value = '';
         document.getElementById('dreamTitle').value = '';
         document.getElementById('dreamMood').value = '';
         
         // Hide results
         this.hideResults();
         
         // Scroll to top
         window.scrollTo({ top: 0, behavior: 'smooth' });
     }

     toggleJournalView() {
         const journalContent = document.getElementById('journalContent');
         const toggleBtn = document.getElementById('toggleJournal');
         const icon = toggleBtn.querySelector('i');
         
         if (journalContent.style.display === 'none') {
             journalContent.style.display = 'block';
             icon.className = 'fas fa-eye-slash';
             toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Günlüğü Gizle';
         } else {
             journalContent.style.display = 'none';
             icon.className = 'fas fa-eye';
             toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Günlüğü Göster';
         }
     }

     // Tema Yönetimi Fonksiyonları
     initializeTheme() {
         const savedTheme = localStorage.getItem('dreamweaver_theme') || 'dark';
         this.setTheme(savedTheme);
     }

     async toggleTheme() {
         const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
         const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
         
         const themeBtn = document.getElementById('themeToggleBtn');
         const icon = themeBtn.querySelector('i');
         
         // Animasyon başlat
         themeBtn.classList.add('switching');
         
         // Icon değiştirme animasyonu
         await this.delay(300);
         
         if (newTheme === 'light') {
             icon.className = 'fas fa-sun';
         } else {
             icon.className = 'fas fa-moon';
         }
         
         // Tema değiştir
         this.setTheme(newTheme);
         
         // Animasyonu bitir
         await this.delay(300);
         themeBtn.classList.remove('switching');
     }

     setTheme(theme) {
         document.documentElement.setAttribute('data-theme', theme);
         localStorage.setItem('dreamweaver_theme', theme);
         
         // Tema butonlarının aktif durumunu güncelle
         const darkBtn = document.getElementById('darkThemeBtn');
         const lightBtn = document.getElementById('lightThemeBtn');
         
         if (darkBtn && lightBtn) {
             darkBtn.classList.toggle('active', theme === 'dark');
             lightBtn.classList.toggle('active', theme === 'light');
         }
         
         // Tema butonunun icon'unu güncelle
         const themeBtn = document.getElementById('themeToggleBtn');
         if (themeBtn) {
             const icon = themeBtn.querySelector('i');
             if (theme === 'light') {
                 icon.className = 'fas fa-sun';
             } else {
                 icon.className = 'fas fa-moon';
             }
         }
         
         // Tema değişikliği bildirimi
         const themeName = theme === 'dark' ? 'Karanlık' : 'Aydınlık';
         this.showSuccess(`${themeName} tema aktif edildi!`);
     }

     // Görsel Üretim Fonksiyonları
     showImageGenerationButton() {
         console.log('showImageGenerationButton çağrıldı');
         // Görsel üretim butonunu sonuçlar bölümüne ekle
         const resultsSection = document.getElementById('resultsSection');
         if (!resultsSection) {
             console.log('resultsSection bulunamadı!');
             return;
         }

         // Mevcut butonu kontrol et
         let imageGenCard = document.getElementById('imageGenerationCard');
         if (imageGenCard) {
             imageGenCard.style.display = 'block';
             return;
         }

         // Yeni görsel üretim kartı oluştur
         imageGenCard = document.createElement('div');
         imageGenCard.id = 'imageGenerationCard';
         imageGenCard.className = 'result-card image-generation-card';
         imageGenCard.innerHTML = `
             <div class="card-header">
                 <h3><i class="fas fa-image"></i> Rüya Görseli Oluştur</h3>
             </div>
             <div class="card-content">
                 <p class="image-gen-info">AI ile rüyanızın görsel temsilini oluşturun</p>
                 <div class="image-generation-controls">
                     <button id="generateImageBtn" class="generate-image-btn">
                         <i class="fas fa-magic"></i>
                         <span>Görsel Oluştur</span>
                         <div class="btn-glow"></div>
                     </button>
                     <div class="image-options" style="display: none;">
                         <label>Görsel Boyutu:</label>
                         <select id="imageSize">
                             <option value="512x512">512x512 (Kare)</option>
                             <option value="768x512">768x512 (Yatay)</option>
                             <option value="512x768">512x768 (Dikey)</option>
                         </select>
                         <label>Kalite:</label>
                         <select id="imageQuality">
                             <option value="30">Hızlı (30 adım)</option>
                             <option value="50" selected>Normal (50 adım)</option>
                             <option value="100">Yüksek (100 adım)</option>
                         </select>
                     </div>
                 </div>
                 <div id="imageResult" class="image-result" style="display: none;"></div>
                 <div id="imageLoading" class="image-loading" style="display: none;">
                     <div class="loading-spinner"></div>
                     <p>AI rüyanızın görselini oluşturuyor...</p>
                 </div>
             </div>
         `;

         // Sonuçlar grid'ine ekle
         const resultsGrid = resultsSection.querySelector('.results-grid');
         if (resultsGrid) {
             resultsGrid.appendChild(imageGenCard);
         }

         // Event listener ekle
         const generateBtn = document.getElementById('generateImageBtn');
         if (generateBtn) {
             console.log('generateImageBtn bulundu, event listener ekleniyor...');
             console.log('Buton özellikleri:', {
                 id: generateBtn.id,
                 className: generateBtn.className,
                 disabled: generateBtn.disabled,
                 style: generateBtn.style.cssText,
                 offsetParent: generateBtn.offsetParent,
                 clientWidth: generateBtn.clientWidth,
                 clientHeight: generateBtn.clientHeight
             });
             
             // Birden fazla event listener türü ekle
             generateBtn.addEventListener('click', (event) => {
                 console.log('CLICK EVENT: GÖRSEL OLUŞTUR butonuna tıklandı!', event);
                 event.preventDefault();
                 event.stopPropagation();
                 this.generateDreamImage();
             });
             
             generateBtn.addEventListener('mousedown', (event) => {
                 console.log('MOUSEDOWN EVENT: Buton basıldı!');
             });
             
             generateBtn.addEventListener('mouseup', (event) => {
                 console.log('MOUSEUP EVENT: Buton bırakıldı!');
             });
             
             console.log('generateImageBtn event listener başarıyla eklendi!');
         } else {
             console.log('generateImageBtn bulunamadı!');
         }
     }

     async generateDreamImage() {
         console.log('generateDreamImage fonksiyonu çağrıldı!');
         try {
             const generateBtn = document.getElementById('generateImageBtn');
             const imageLoading = document.getElementById('imageLoading');
             const imageResult = document.getElementById('imageResult');
             
             console.log('Butonlar bulundu:', {generateBtn, imageLoading, imageResult});

             // UI durumunu güncelle
             generateBtn.disabled = true;
             imageLoading.style.display = 'block';
             imageResult.style.display = 'none';

             // Rüya prompt'u oluştur
             console.log('Rüya prompt oluşturuluyor...');
             const dreamPrompt = await this.createDreamPrompt();
             console.log('Oluşturulan prompt:', dreamPrompt);
             if (!dreamPrompt) {
                 throw new Error('Rüya prompt\'u oluşturulamadı');
             }

             // Görsel parametrelerini al
             const sizeSelect = document.getElementById('imageSize');
             const qualitySelect = document.getElementById('imageQuality');
             const [width, height] = (sizeSelect?.value || '512x512').split('x').map(Number);
             const steps = parseInt(qualitySelect?.value || '50');

             // API çağrısı yap
             console.log('API çağrısı yapılıyor...', {
                 prompt: dreamPrompt,
                 width: width,
                 height: height,
                 steps: steps,
                 scale: 7.5
             });
             const response = await fetch('http://localhost:5000/generate', {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({
                     prompt: dreamPrompt,
                     width: width,
                     height: height,
                     steps: steps,
                     scale: 7.5
                 })
             });
             console.log('API yanıtı alındı:', response.status, response.statusText);

             if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || 'Görsel üretim hatası');
             }

             const result = await response.json();
             
             if (result.success && result.image_base64) {
                 this.displayGeneratedImage(result);
             } else {
                 throw new Error('Görsel üretilemedi');
             }

         } catch (error) {
             console.error('Görsel üretim hatası:', error);
             this.showError(`Görsel üretim hatası: ${error.message}`);
         } finally {
             // UI durumunu sıfırla
             const generateBtn = document.getElementById('generateImageBtn');
             const imageLoading = document.getElementById('imageLoading');
             
             if (generateBtn) generateBtn.disabled = false;
             if (imageLoading) imageLoading.style.display = 'none';
         }
     }

     async createDreamPrompt() {
         try {
             if (!this.currentAnalysis) {
                 throw new Error('Analiz verisi bulunamadı');
             }

             const response = await fetch('http://localhost:5000/dream-prompt', {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({
                     dream_text: this.currentAnalysis.dream,
                     symbols: this.currentAnalysis.analysis.symbols || [],
                     emotions: this.currentAnalysis.analysis.emotions || []
                 })
             });

             if (!response.ok) {
                 throw new Error('Prompt oluşturulamadı');
             }

             const result = await response.json();
             return result.success ? result.prompt : null;

         } catch (error) {
             console.error('Prompt oluşturma hatası:', error);
             // Fallback prompt
             return this.createFallbackPrompt();
         }
     }

     createFallbackPrompt() {
         if (!this.currentAnalysis) return 'dreamlike, surreal, mystical, digital art';

         const dreamText = this.currentAnalysis.dream.toLowerCase();
         const symbols = this.currentAnalysis.analysis.symbols || [];
         const emotions = this.currentAnalysis.analysis.emotions || [];

         let prompt = 'dreamlike, surreal, mystical';

         // Semboller ekle
         if (symbols.length > 0) {
             const symbolNames = symbols.slice(0, 3).map(s => s.symbol).join(', ');
             prompt += `, ${symbolNames}`;
         }

         // Duygusal ton
         if (emotions.length > 0) {
             const emotion = emotions[0].emotion;
             if (['mutlu', 'huzurlu', 'heyecanlı'].includes(emotion)) {
                 prompt += ', bright, peaceful, harmonious';
             } else if (['endişeli', 'korkmuş', 'üzgün'].includes(emotion)) {
                 prompt += ', dark, mysterious, moody';
             } else {
                 prompt += ', ethereal, contemplative';
             }
         }

         prompt += ', digital art, fantasy, detailed, cinematic lighting';
         return prompt;
     }

     displayGeneratedImage(result) {
         const imageResult = document.getElementById('imageResult');
         if (!imageResult) return;

         imageResult.innerHTML = `
             <div class="generated-image-container">
                 <img src="data:image/png;base64,${result.image_base64}" 
                      alt="Rüya Görseli" 
                      class="generated-image" />
                 <div class="image-info">
                     <p><strong>Prompt:</strong> ${result.prompt}</p>
                     <div class="image-actions">
                         <button onclick="dreamAI.downloadImage('${result.image_base64}', '${result.filename}')" 
                                 class="download-btn">
                             <i class="fas fa-download"></i> İndir
                         </button>
                         <button onclick="dreamAI.shareImage('${result.image_base64}')" 
                                 class="share-btn">
                             <i class="fas fa-share"></i> Paylaş
                         </button>
                     </div>
                 </div>
             </div>
         `;

         imageResult.style.display = 'block';
         this.showSuccess('Rüya görseli başarıyla oluşturuldu!');
     }

     downloadImage(base64Data, filename) {
         const link = document.createElement('a');
         link.href = `data:image/png;base64,${base64Data}`;
         link.download = filename || 'ruya-gorseli.png';
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
     }

     async shareImage(base64Data) {
         if (navigator.share) {
             try {
                 // Base64'ü blob'a çevir
                 const response = await fetch(`data:image/png;base64,${base64Data}`);
                 const blob = await response.blob();
                 const file = new File([blob], 'ruya-gorseli.png', { type: 'image/png' });

                 await navigator.share({
                     title: 'DreamAI - Rüya Görseli',
                     text: 'DreamAI ile oluşturduğum rüya görseli',
                     files: [file]
                 });
             } catch (error) {
                 console.error('Paylaşım hatası:', error);
                 this.copyImageToClipboard(base64Data);
             }
         } else {
             this.copyImageToClipboard(base64Data);
         }
     }

     async copyImageToClipboard(base64Data) {
         try {
             const response = await fetch(`data:image/png;base64,${base64Data}`);
             const blob = await response.blob();
             await navigator.clipboard.write([
                 new ClipboardItem({ 'image/png': blob })
             ]);
             this.showSuccess('Görsel panoya kopyalandı!');
         } catch (error) {
             console.error('Panoya kopyalama hatası:', error);
             this.showError('Görsel kopyalanamadı');
         }
     }
 }

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM yüklendi, DreamAI başlatılıyor...');
    window.dreamAI = new DreamAI();
    console.log('DreamAI başlatıldı!');
});

// Add some CSS for notifications
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.success {
        background: linear-gradient(135deg, #4CAF50, #45a049);
    }
    
    .notification.error {
        background: linear-gradient(135deg, #f44336, #da190b);
    }
    
    .journal-entry {
        background: rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 15px;
        border: 1px solid rgba(255,255,255,0.2);
        transition: transform 0.2s ease;
    }
    
    .journal-entry:hover {
        transform: translateY(-2px);
        background: rgba(255,255,255,0.15);
    }
    
    .entry-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .entry-date {
        color: #a0a0ff;
        font-size: 0.9em;
        font-weight: 500;
    }
    
    .delete-entry {
        background: rgba(255,100,100,0.2);
        border: none;
        color: #ff6b6b;
        padding: 5px 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s ease;
    }
    
    .delete-entry:hover {
        background: rgba(255,100,100,0.4);
    }
    
    .entry-preview {
        color: #e0e0e0;
        line-height: 1.5;
        margin-bottom: 10px;
    }
    
    .entry-emotions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }
    
    .emotion-tag {
        background: rgba(138, 43, 226, 0.3);
        color: #dda0dd;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8em;
        border: 1px solid rgba(138, 43, 226, 0.5);
    }
    
    .no-dreams {
        text-align: center;
        color: #888;
        font-style: italic;
        padding: 40px 20px;
    }
`;
document.head.appendChild(style);