from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
import google.generativeai as genai
import os
from dotenv import load_dotenv

# .env dosyasındaki ortam değişkenlerini yükle
load_dotenv()

# Gemini API'yi yapılandır
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("Uyarı: GEMINI_API_KEY bulunamadı. Lütfen backend/.env dosyasını kontrol edin.")

app = Flask(__name__)
CORS(app)

def get_video_id(url):
    try:
        if "watch?v=" in url:
            return url.split("watch?v=")[1].split("&")[0]
        elif "youtu.be/" in url:
            return url.split("youtu.be/")[1].split("?")[0]
    except Exception:
        return None
    return None

@app.route('/get_transcript', methods=['POST'])
def get_transcript():
    data = request.get_json()
    video_url = data.get('video_url')
    video_id = get_video_id(video_url)

    if not video_id:
        return jsonify({'error': 'Geçersiz YouTube URL'}), 400
        
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['tr', 'en'])
        transcript_text = " ".join([d['text'] for d in transcript_list])
        return jsonify({'transcript': transcript_text})
    except Exception as e:
        return jsonify({'error': f'Transkript alınamadı: {str(e)}'}), 500

@app.route('/summarize', methods=['POST'])
def summarize():
    data = request.get_json()
    video_url = data.get('video_url')

    if not video_url:
        return jsonify({'error': 'video_url gönderilmedi'}), 400

    video_id = get_video_id(video_url)
    if not video_id:
        return jsonify({'error': 'Geçersiz YouTube URL'}), 400
    
    if not api_key:
        return jsonify({'error': 'Gemini API anahtarı sunucuda ayarlanmamış.'}), 500

    try:
        # Transkripti al
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['tr', 'en'])
        transcript = " ".join([d['text'] for d in transcript_list])

        # Gemini'nin token limitini aşmamak için transkripti kırp
        max_chars = 15000
        if len(transcript) > max_chars:
            transcript = transcript[:max_chars]

        # Gemini ile özetle
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"Şu YouTube transkriptini akıcı bir dille özetle ve videonun ana fikrini anlat:\n\nTRANSKRIPT:\n{transcript}"
        
        response = model.generate_content(prompt)
        summary = response.text

    except Exception as e:
        print(f"Hata: {e}")
        return jsonify({'error': f'Transkript alınamadı veya özetlenemedi: {str(e)}'}), 500
    
    return jsonify({'summary': summary})

if __name__ == '__main__':
    print("Backend sunucusu HTTP modda başlatılıyor...")
    print("API anahtarının backend/.env dosyasında GEMINI_API_KEY olarak ayarlandığından emin olun.")
    app.run(host='localhost', port=5000, debug=True) 