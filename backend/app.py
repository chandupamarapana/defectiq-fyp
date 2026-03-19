from auth import require_auth
from detection import detect
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from config import UPLOAD_FOLDER, MAX_CONTENT_LENGTH
import auth
import database as db

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ── Auth routes ───────────────────────────────
app.add_url_rule('/register', view_func=auth.register, methods=['POST'])
app.add_url_rule('/login',    view_func=auth.login,    methods=['POST'])

# ── Protected routes ──────────────────────────


@app.route('/detect', methods=['POST'])
@require_auth
def detect_route():
    from flask import request
    user_id = getattr(request, 'user_id', None)
    print(f"[detect_route] user_id={user_id}")
    return detect(user_id)


@app.route('/history', methods=['GET'])
@require_auth
def history():
    return jsonify({'history': db.get_history(
        request.user_id,
        limit=int(request.args.get('limit', 50)),
        date_from=request.args.get('from'),
        date_to=request.args.get('to'),
    )}), 200


@app.route('/stats', methods=['GET'])
@require_auth
def stats():
    return jsonify(db.get_stats(
        request.user_id,
        date_from=request.args.get('from'),
        date_to=request.args.get('to'),
    )), 200


@app.route('/health', methods=['GET'])
def health():
    from detection import CLASSES
    return jsonify({
        'status':  'healthy',
        'model':   'EfficientNet-B2 + AlexNet',
        'classes': CLASSES,
    })


if __name__ == '__main__':
    print("DefectIQ API v5 — Supabase + Auth")
    app.run(debug=True, host='0.0.0.0', port=5000)
