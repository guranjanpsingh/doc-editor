# Document Editor Project

This project is a collaborative document editor built with React, Flask, and Socket.io. It allows multiple users to edit documents in real-time.

### 1. Clone the Repository

```
git clone git@github.com:guranjanpsingh/doc-editor.git
cd document-editor
```

### 2. Install depnedencies

#### Frontend

```
cd frontend
npm install
```

#### Backend

```
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
```

### 3. Running the application

from backend directory

```
python app.py
```

This will run the backed on localhost:8000. The frontend app is hardcoding api calls to localhost:8000

Running frontend

```
cd ../frontend
npm start
```
