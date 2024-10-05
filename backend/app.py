from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import logging
from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from datetime import timezone

from sqlalchemy.sql.functions import current_user

# Configure logging
logging.basicConfig(level=logging.DEBUG,  # Log level
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',  # Log format
                    handlers=[logging.StreamHandler()])  # Output logs to console
logger = logging.getLogger(__name__)

# create the app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'aldhgslfj3o4u23hfa348yhsg384' #random manually created
# configure the SQLite database, relative to the app instance folder
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

socketio = SocketIO(app, cors_allowed_origins="*")
# initialize the app with the extension
db = SQLAlchemy(app)

jwt = JWTManager(app)

CORS(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(80), nullable=False)
    documents = db.relationship('Document', back_populates='owner')
    collaborations = db.relationship('Collaborator', back_populates='user')


class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    content = db.Column(db.Text, nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    owner = db.relationship('User', back_populates='documents')
    collaborators = db.relationship('Collaborator', back_populates='document', lazy=True)


class Collaborator(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey("document.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    __table_args__ = (
        db.UniqueConstraint('document_id', 'user_id', name='uix_document_user'),
    )
    user = db.relationship('User', back_populates='collaborations')
    document = db.relationship('Document', back_populates='collaborators')


@app.route("/register", methods=["POST"])
def register():
    if request.method == "POST":
        data = request.get_json()
        logger.info(data)
        if "username" not in data or "email" not in data or "password" not in data:
            return jsonify({"message": "Missing fields"}), 400
        username = data["username"]
        email = data["email"]
        password = data["password"]
        if username == "" or email == "" or password == "":
            return jsonify({"error": "All fields are required"}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({"message": "User already exists"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"message": "Email already exists"}), 400

        hashed_pw = Bcrypt().generate_password_hash(password).decode("utf-8")
        new_user = User(username=username, email=email, password=hashed_pw)
        db.session.add(new_user)
        db.session.commit()
        access_token = create_access_token(identity=new_user.id)
        return jsonify({"message": "User created", "access_token": access_token}), 201


@app.route("/login", methods=["POST"])
def login():
    if request.method == "POST":
        data = request.get_json()
        logger.debug(data)
        if "username" not in data or "password" not in data:
            return jsonify({"message": "Missing fields"}), 400
        username = data["username"]
        password = data["password"]
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"message": "Invalid logifdsfn"}), 400

        if not Bcrypt().check_password_hash(user.password, password):
            return jsonify({"message": "Invalid login"}), 400

        #create token
        access_token = create_access_token(identity=user.id)
        return jsonify({"access_token": access_token, "user_id": user.id}), 200

@app.route("/collaborations", methods=["GET"])
@jwt_required()
def collaborations():
    user = get_jwt_identity()
    collabs = Collaborator.query.filter_by(user_id=user).all()
    return jsonify(
        {
            "collaborations":
                 [
                     {
                        'id': c.document.id,
                        'name': c.document.name,
                        'owner': c.document.owner_id,
                        'content': c.document.content
                     }
                     for c in collabs
                 ]
        }
    ), 200

@app.route("/documents", methods=["GET", "POST"])
@jwt_required()
def get_documents():
    user = get_jwt_identity()
    if request.method == "GET":
        docs = Document.query.filter_by(owner_id=user).all()
        documents = [{'id': doc.id, 'name': doc.name, 'owner': doc.owner_id, 'content': doc.content} for doc in docs]
        return jsonify({"documents": documents}), 200
    if request.method == "POST":
        data = request.get_json()
        if "name" not in data:
            return jsonify({"message": "Missing fields"}), 400
        logger.debug(f"user creating doc: {user}")
        doc = Document(name=data["name"], owner_id=user, content="")
        db.session.add(doc)
        db.session.commit()
        return jsonify({"message": "Document created", "document": {'id': doc.id, 'name': doc.name, 'owner': doc.owner_id, 'content': doc.content}}), 201


@app.route("/documents/<int:document_id>", methods=["GET", "DELETE"])
@jwt_required()
def get_or_delete_document(document_id: int):
    if request.method == "GET":
        doc = Document.query.filter_by(id=document_id).first()
        if doc:
            return jsonify({"document": {"content": doc.content, "collaborators": [c.user.email for c in doc.collaborators]}}), 200
        else:
            return jsonify({"message": "Document not found"}), 404
    elif request.method == "DELETE":
        doc = Document.query.filter_by(id=document_id).first()
        if doc:
            db.session.delete(doc)
            db.session.commit()
            return jsonify({"message": "Document deleted"}), 200
        else:
            return jsonify({"message": "Document not found"}), 404


@app.route("/documents/<int:document_id>/collaborators", methods=["GET", "POST", "DELETE"])
@jwt_required()
def collaborators(document_id: int):
    document = Document.query.filter_by(id=document_id).first()
    owner = document.owner
    logger.debug(f"ONWER ID {document.owner_id}")
    if request.method == "GET":
        collabs = Document.query.filter_by(id=document_id).first().collaborators
        logger.debug(f"collaborators: {[collab.user.email for collab in collabs]}")
        return jsonify({"collaborators": [collab.user.email for collab in collabs]}), 200
    elif request.method == "POST":
        data = request.get_json()
        if "collaborator_email" in data and data["collaborator_email"] != "":
            user = User.query.filter_by(email=data["collaborator_email"]).first()
            logger.debug(f"user: {user}")
            if user is not None:
                if user.id == owner.id:
                    return jsonify({"message": "Cannot add yourself as collaborator"}), 400
                doc = Document.query.filter_by(id=document_id).first()
                collab = Collaborator(user_id=user.id, document_id=doc.id)
                db.session.add(collab)
                db.session.commit()
                logger.debug(doc.collaborators)
                return jsonify({"message": "added"}), 201
            else:
                return jsonify({"message": "Invalid email"}), 200
        else:
            return jsonify({"message": "Missing fields"}), 400
    elif request.method == "DELETE":
        data = request.get_json()
        if "collaborator_email" in data and data["collaborator_email"] != "":
            user = User.query.filter_by(email=data["collaborator_email"]).first()
            collab = Collaborator.query.filter_by(user_id=user.id, document_id=document_id).first()
            db.session.delete(collab)
            db.session.commit()
            return jsonify({"message": "removed"}), 200


@app.route("/test_login", methods=["GET"])
@jwt_required()
def test_login():
    user = get_jwt_identity()
    if not user:
        return jsonify({"message": "Invalid login"}), 200
    return jsonify({"message": f"Logged in as {user}"}), 200


@socketio.on('join_document')
@jwt_required()
def join_document(data):
    user = get_jwt_identity()
    if "document_id" in data:
        logger.debug(f"{user} Joining document {data['document_id']}")
        join_room(data["document_id"])


@socketio.on('leave_document')
@jwt_required()
def leave_document(data):
    user = get_jwt_identity()
    if "document_id" in data:
        logger.debug(f"{user} Leaving document {data['document_id']}")
        leave_room(data["document_id"])


@socketio.on('document_updated')
@jwt_required()
def document_updated(data):
    logger.debug("Start updating document")
    user_id = get_jwt_identity()
    user = User.query.filter_by(id=user_id).first()
    logger.debug(data)
    data["user_id"] = user_id
    if not user:
        return jsonify({"message": "Invalid login"}), 200
    if "id" in data and "content" in data:
        document = Document.query.filter_by(id=data["id"]).first()
        if document.owner_id == user_id or user in [c.user for c in document.collaborators]:
            content = data["content"]
            document.content = content
            db.session.commit()
            emit("document_broadcast", data, broadcast=True, room=data["id"], include_self=False)
        else:
            logger.debug(f"user: {user} does not have permission to updated doc {document.id}")
            return jsonify({"message": "You do not have permission to do that"}), 403



if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True, port=8000)
