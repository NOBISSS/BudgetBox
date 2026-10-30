process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/budgetbox-test";
process.env.REDIS_URL = "redis://127.0.0.1:6379";
process.env.JWT_SECRET =
  "test-secret-that-is-at-least-thirty-two-characters-long";
process.env.BCRYPT_COST = "10";
process.env.SMTP_HOST = "smtp.test";
process.env.SMTP_USER = "test-user";
process.env.SMTP_PASS = "test-password";
process.env.MONGOMS_DOWNLOAD_DIR = `${process.cwd()}/.cache/mongodb-binaries`;
