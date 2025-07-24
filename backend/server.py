from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from openai import OpenAI
import os
from dotenv import load_dotenv

# .env dosyasını hala yerel geliştirme için kullanabilirsiniz ama öncelik istekten gelen anahtar olacak
load_dotenv()

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
    
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'API anahtarı eksik veya geçersiz.'}), 401
        
    api_key = auth_header.split(' ')[1]

    try:
        # Her istek için yeni bir OpenAI istemcisi oluştur ve anahtarı ata
        client = OpenAI(api_key=api_key)

        # Transkripti al
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['tr', 'en'])
        transcript = " ".join([d['text'] for d in transcript_list])


        # OpenAI ile özetle
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": f"Şu YouTube transkriptini akıcı bir dille özetle ve videonun ana fikrini anlat:\n\nTRANSKRIPT:\n{transcript}"}
            ]
        )
        summary = response.choices[0].message.content.strip()

    except Exception as e:
        # Hata mesajını daha anlaşılır hale getir
        error_message = str(e)
        if "Incorrect API key" in error_message:
            return jsonify({'error': 'Geçersiz OpenAI API anahtarı.'}), 401
        
        print(f"Hata: {e}")
        return jsonify({'error': f'Transkript alınamadı veya özetlenemedi: {error_message}'}), 500
    
    return jsonify({'summary': summary})

if __name__ == '__main__':
    print("Backend sunucusu HTTP modda başlatılıyor...")
    app.run(host='localhost', port=5000, debug=True) 