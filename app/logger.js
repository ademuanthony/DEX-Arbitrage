const logger = {
  info: (msg, label = '') => {
    console.log(`${new Date().toTimeString()} INFO ${label} - ${msg}`);
  },
  error: (msg, label = '') => {
    console.log(`${new Date().toTimeString()} INFO ${label} - ${msg}`);
  },
  success: (msg, label = '') => {
    console.log(`${new Date().toTimeString()} INFO ${label} - ${msg}`);
  },
};

module.exports = logger;
