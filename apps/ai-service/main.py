from fastapi import FastAPI

app = FastAPI(title="Mini ERP AI Service")

@app.get("/")
def read_root():
    return {"message": "AI Service is up and running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
