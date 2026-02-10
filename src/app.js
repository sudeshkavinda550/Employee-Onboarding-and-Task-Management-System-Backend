const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const analyticsRoutes = require('./routes/analyticsRoutes');
const employeeRoutes = require('./routes/employeeRoutes'); 
const taskRoutes = require('./routes/taskRoutes');

const app = express();

console.log('Analytics routes type:', typeof analyticsRoutes);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
}, express.static('uploads'));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);
  next();
});

console.log('Mounting /api/v1/analytics');
app.use('/api/v1/analytics', analyticsRoutes);

console.log('Mounting /api/v1/employees');
app.use('/api/v1/employees', employeeRoutes);

console.log('Mounting /api/v1/tasks'); 
app.use('/api/v1/tasks', taskRoutes); 

console.log('Mounting routes at /api/v1');
app.use('/api/v1', routes);

console.log('Registered routes:');
app._router.stack.forEach((r) => {
  if (r.route) {
    console.log(`  ${Object.keys(r.route.methods)} ${r.route.path}`);
  } else if (r.name === 'router') {
    console.log(`  ROUTER: ${r.regexp}`);
    if (r.handle && r.handle.stack) {
      r.handle.stack.forEach((layer) => {
        if (layer.route) {
          const path = r.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)', '');
          console.log(`    ${Object.keys(layer.route.methods)} ${path}${layer.route.path}`);
        }
      });
    }
  }
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;