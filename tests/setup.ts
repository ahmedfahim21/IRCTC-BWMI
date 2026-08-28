/**
 * Unit tests always run against the generated world. A live key in the
 * environment would spend the monthly RailRadar budget and make assertions
 * depend on today's network.
 */
process.env.RAILRADAR_API_KEY = "";
process.env.SARVAM_API_KEY = "";
process.env.ANTHROPIC_API_KEY = "";
