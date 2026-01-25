const { 
    format, 
    addDays, 
    differenceInDays, 
    isAfter, 
    isBefore,
    parseISO,
    startOfDay,
    endOfDay,
  } = require('date-fns');
  
  /**
   * Format date to string
   * @param {Date|string} date - Date to format
   * @param {string} formatStr - Format string
   * @returns {string} Formatted date
   */
  const formatDate = (date, formatStr = 'yyyy-MM-dd') => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      return format(dateObj, formatStr);
    } catch (error) {
      return null;
    }
  };
  
  /**
   * Add days to a date
   * @param {Date|string} date - Starting date
   * @param {number} days - Days to add
   * @returns {Date} New date
   */
  const addDaysToDate = (date, days) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return addDays(dateObj, days);
  };
  
  /**
   * Calculate days between dates
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {number} Days difference
   */
  const daysBetween = (startDate, endDate) => {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    return differenceInDays(end, start);
  };
  
  /**
   * Check if date is in the past
   * @param {Date|string} date - Date to check
   * @returns {boolean} Is past
   */
  const isPast = (date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isBefore(dateObj, new Date());
  };
  
  /**
   * Check if date is in the future
   * @param {Date|string} date - Date to check
   * @returns {boolean} Is future
   */
  const isFuture = (date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isAfter(dateObj, new Date());
  };
  
  /**
   * Get start of day
   * @param {Date|string} date - Date
   * @returns {Date} Start of day
   */
  const getStartOfDay = (date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return startOfDay(dateObj);
  };
  
  /**
   * Get end of day
   * @param {Date|string} date - Date
   * @returns {Date} End of day
   */
  const getEndOfDay = (date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return endOfDay(dateObj);
  };
  
  /**
   * Calculate due date from start date and estimated days
   * @param {Date|string} startDate - Start date
   * @param {number} estimatedDays - Estimated completion days
   * @returns {Date} Due date
   */
  const calculateDueDate = (startDate, estimatedDays) => {
    return addDaysToDate(startDate, estimatedDays);
  };
  
  module.exports = {
    formatDate,
    addDaysToDate,
    daysBetween,
    isPast,
    isFuture,
    getStartOfDay,
    getEndOfDay,
    calculateDueDate,
  };