const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const JWT_SECRET =
  process.env.JWT_SECRET || 'antipoaching-ops-secret-key-2026';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Role hierarchy: admin > ranger > viewer
// admin:  full write access + user mgmt
// ranger: write access (field ops)
// viewer: read-only
const ROLES = ['viewer', 'ranger', 'admin'];

function requireRole(...allowed) {
  return (req, res, next) => {
    const role = req.user?.role || 'viewer';
    if (!allowed.includes(role)) {
      return res.status(403).json({
        error: `Forbidden: requires one of [${allowed.join(', ')}], got '${role}'`,
      });
    }
    next();
  };
}

// Convenience: any non-viewer write (admin or ranger)
const requireWriter = requireRole('admin', 'ranger');
// Convenience: admin-only
const requireCommander = requireRole('admin');
const requireAdmin = requireCommander;

// Mounts auto-guards onto a CRUD router so GET stays open to all authenticated
// users while POST/PUT/DELETE require writer role. Use INSTEAD of writing
// per-route guards inside each routes/<name>.js file.
function withCrudRbac(router) {
  router.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return requireWriter(req, res, next);
    }
    return next();
  });
  return router;
}

module.exports = {
  authenticateToken,
  JWT_SECRET,
  ROLES,
  requireRole,
  requireWriter,
  requireCommander,
  requireAdmin,
  withCrudRbac,
};
