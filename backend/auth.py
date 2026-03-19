from flask import request, jsonify
import bcrypt
import jwt as pyjwt
from datetime import datetime, timedelta
from functools import wraps
from config import SECRET_KEY
import database as db


def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_password(password, hashed):
    return bcrypt.checkpw(password.encode(), hashed.encode())


def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp':     datetime.utcnow() + timedelta(hours=24)
    }
    return pyjwt.encode(payload, SECRET_KEY, algorithm='HS256')


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get(
            'Authorization', '').replace('Bearer ', '').strip()
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        try:
            payload = pyjwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            request.user_id = payload['user_id']
        except pyjwt.ExpiredSignatureError:
            return jsonify({'error': 'Session expired — please login again'}), 401
        except pyjwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated


def register():
    data = request.get_json()
    required = ['username', 'password',
                'full_name', 'profession', 'factory_name']
    if not all(k in data for k in required):
        return jsonify({'error': f'Required: {", ".join(required)}'}), 400

    username = data['username'].strip().lower()
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    new_id, error = db.create_user(
        username=username,
        password_hash=hash_password(data['password']),
        full_name=data['full_name'].strip(),
        profession=data['profession'].strip(),
        factory_name=data['factory_name'].strip(),
    )
    if error:
        return jsonify({'error': error}), 409

    user = db.find_user_by_username(username)
    token = generate_token(new_id)
    return jsonify({
        'message': 'Account created successfully',
        'token':   token,
        'user': {
            'id':           new_id,
            'username':     user['username'],
            'full_name':    user['full_name'],
            'profession':   user['profession'],
            'factory_name': user['factory_name'],
        }
    }), 201


def login():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Username and password required'}), 400

    username = data['username'].strip().lower()
    user = db.find_user_by_username(username)

    if not user or not check_password(data['password'], user['password']):
        return jsonify({'error': 'Invalid username or password'}), 401

    return jsonify({
        'token': generate_token(user['id']),
        'user': {
            'id':           user['id'],
            'username':     user['username'],
            'full_name':    user['full_name'],
            'profession':   user['profession'],
            'factory_name': user['factory_name'],
        }
    }), 200
