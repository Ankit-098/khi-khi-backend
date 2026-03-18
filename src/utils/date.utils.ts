import moment from 'moment-timezone';

// Configure moment to use Asia/Kolkata timezone globally
const TIMEZONE = 'Asia/Kolkata';
moment.tz.setDefault(TIMEZONE);

/**
 * Date Utility
 * Centralized time management configured for IST
 */
export const dateUtils = {
    /**
     * Get current time in configured timezone
     */
    now: () => moment(),

    /**
     * Format a date to standard IST string
     */
    format: (date?: Date | string | number | moment.Moment, formatStr: string = 'YYYY-MM-DD HH:mm:ss') => {
        return moment(date).format(formatStr);
    },

    /**
     * Parse a date to moment object in configured timezone
     */
    parse: (date: Date | string | number | moment.Moment) => moment(date),

    /**
     * Get native JS Date object from moment (in IST)
     */
    toDate: (momentObj: moment.Moment) => momentObj.toDate(),

    /**
     * Add duration to a date
     */
    add: (date: Date | string | number | moment.Moment, amount: number, unit: moment.unitOfTime.DurationConstructor) => {
        return moment(date).add(amount, unit);
    },

    /**
     * Get timezone name
     */
    getTimezone: () => TIMEZONE
};

export default moment;
