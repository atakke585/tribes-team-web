(function () {
    
    window.DISABLE_GTM_DEBUG = true; // Set to false to enable debug mode
    
    // Include structured logging utility for browser environment
    // This would typically be loaded as a separate script tag in production
    
    // Browser-compatible logger for client-side tracking script
    function BrowserLogger(component, options) {
        options = options || {};
        this.component = component;
        this.enableDebug = options.enableDebug || 
            (typeof window !== 'undefined' && (
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1'
            ));
    }

    BrowserLogger.prototype.createLogEntry = function(level, message, data) {
        data = data || {};
        return {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            component: this.component,
            message: message,
            data: data
        };
    };

    BrowserLogger.prototype.debug = function(message, data) {
        if (!this.enableDebug) return;
        const entry = this.createLogEntry('DEBUG', message, data);
        console.log(`[${this.component}] ${message}`, entry);
    };

    BrowserLogger.prototype.info = function(message, data) {
        if (!this.enableDebug) return;
        const entry = this.createLogEntry('INFO', message, data);
        console.log(`[${this.component}] ${message}`, entry);
    };

    BrowserLogger.prototype.warn = function(message, data) {
        if (!this.enableDebug) return;
        const entry = this.createLogEntry('WARN', message, data);
        console.warn(`[${this.component}] ${message}`, entry);
    };

    BrowserLogger.prototype.error = function(message, error, data) {
        const errorData = data || {};
        if (error) {
            errorData.error = {
                message: error.message,
                name: error.name,
                stack: error.stack
            };
        }
        
        const entry = this.createLogEntry('ERROR', message, errorData);
        console.error(`[${this.component}] ${message}`, entry);
    };

    BrowserLogger.prototype.logApiCall = function(method, url, statusCode, duration, data) {
        const message = `API ${method} ${url} - ${statusCode} (${duration}ms)`;
        const apiData = data || {};
        apiData.api = { method, url, statusCode, duration };

        if (statusCode >= 400) {
            this.error(message, null, apiData);
        } else {
            this.info(message, apiData);
        }
    };

    BrowserLogger.prototype.logConsentEvent = function(eventType, category, value, data) {
        const message = `Consent ${eventType}: ${category} = ${value}`;
        const consentData = data || {};
        consentData.consent = { eventType, category, value };
        this.info(message, consentData);
    };

    // Make logger available globally for the tracking script
    window.TrackingLogger = {
        BrowserLogger: BrowserLogger,
        createLogger: function(component, options) {
            return new BrowserLogger(component, options);
        }
    };

    const TRACKER_CONFIG = {
        apiEndpoint: window.RECEIVING_API_ENDPOINT || window.TRACKER_360_CONFIG?.apiEndpoint || 'https://98he5gsum3.execute-api.us-west-1.amazonaws.com/track',
        sessionDataKey: 'sessionData',
        visitorIdKey: 'visitorId',
        tempParamsKey: 'tempParams',
        // New storage keys for consent-based data
        marketingDataKey: 'marketingData',
        analyticsDataKey: 'analyticsData',
        firstLandingURLKey: 'firstLandingURL',
        customId: window.TRACKER_360_CONFIG?.customId || '11111',
        retryAttempts: window.TRACKER_360_CONFIG?.retryAttempts || 3,
        retryDelay: window.TRACKER_360_CONFIG?.retryDelay || 1000,
        requestTimeout: window.TRACKER_360_CONFIG?.requestTimeout || 10000,
        enableRefTracking: window.TRACKER_360_CONFIG?.enableRefTracking !== undefined ? window.TRACKER_360_CONFIG.enableRefTracking : true,
        enableConsentTracking: window.TRACKER_360_CONFIG?.enableConsentTracking !== undefined ? window.TRACKER_360_CONFIG.enableConsentTracking : true,
        enableFallbackConsentManager: window.TRACKER_360_CONFIG?.enableFallbackConsentManager !== undefined ? window.TRACKER_360_CONFIG.enableFallbackConsentManager : true,
        enableLogging: window.TRACKER_360_CONFIG?.enableLogging !== undefined ? window.TRACKER_360_CONFIG.enableLogging : true,
        // Dynamic form submission detection configuration
        formSubmissionConfig: window.TRACKER_360_CONFIG?.formSubmissionConfig || {
            enabled: true,
            // Selectors for form submission buttons/triggers
            buttonSelectors: ['button', 'span', 'input[type="submit"]'],
            // Text patterns to match in button/link text (case insensitive)
            textPatterns: ['submit', 'send', 'book', 'book now', 'submit form'],
            // CSS selectors for forms to track
            formSelectors: ['form'],
            // Data attributes to check
            dataAttributes: ['data-track-form', 'data-tracking-form'],
            // Classes to check
            trackingClasses: ['track-form', 'tracking-form']
        },
        // Phone click tracking configuration
        phoneTrackingConfig: window.TRACKER_360_CONFIG?.phoneTrackingConfig || {
            enabled: true,
            // Link patterns to match
            linkPatterns: ['tel:', 'callto:'],
            // Selectors for phone number elements
            selectors: ['a[href^="tel:"]', 'a[href^="callto:"]']
        }
    };

    // Ã¢Å“â€¦ Enhanced API call function with retry logic, error handling, and performance timing
    const sendTrackingData = (data, retryCount = 0) => {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            let timeoutId;
            
            // Set up timeout handler
            timeoutId = setTimeout(() => {
                xhr.abort();
                const duration = Date.now() - startTime;
                const error = new Error(`Request timeout after ${TRACKER_CONFIG.requestTimeout}ms`);
                error.type = 'timeout';
                
                if (!logger) initializeLogger();
                logger.logApiCall('POST', TRACKER_CONFIG.apiEndpoint, 0, duration, {
                    eventType: data.eventType,
                    visitorId: data.visitorId,
                    attempt: retryCount + 1,
                    timeout: true
                });
                
                handleRequestError(error, data, retryCount, resolve, reject);
            }, TRACKER_CONFIG.requestTimeout);
            
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    clearTimeout(timeoutId);
                    const duration = Date.now() - startTime;
                    
                    if (!logger) initializeLogger();
                    logger.logApiCall('POST', TRACKER_CONFIG.apiEndpoint, xhr.status, duration, {
                        eventType: data.event_type || data.eventType,
                        visitorId: data.visitor_id || data.visitorId,
                        attempt: retryCount + 1,
                        responseSize: xhr.responseText ? xhr.responseText.length : 0
                    });
                    
                    if (xhr.status >= 200 && xhr.status < 300) {
                        // Success
                        logTrackingEvent('success', {
                            status: xhr.status,
                            attempt: retryCount + 1,
                            eventType: data.event_type || data.eventType,
                            visitorId: data.visitor_id || data.visitorId,
                            duration
                        });
                        resolve({
                            status: xhr.status,
                            response: xhr.responseText,
                            attempt: retryCount + 1,
                            duration
                        });
                    } else {
                        // HTTP error
                        const error = new Error(`HTTP Error: ${xhr.status} - ${xhr.statusText}`);
                        error.type = 'http';
                        error.status = xhr.status;
                        error.response = xhr.responseText;
                        handleRequestError(error, data, retryCount, resolve, reject);
                    }
                }
            };
            
            xhr.onerror = () => {
                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;
                const error = new Error('Network error occurred');
                error.type = 'network';
                
                if (!logger) initializeLogger();
                logger.logApiCall('POST', TRACKER_CONFIG.apiEndpoint, 0, duration, {
                    eventType: data.eventType,
                    visitorId: data.visitorId,
                    attempt: retryCount + 1,
                    networkError: true
                });
                
                handleRequestError(error, data, retryCount, resolve, reject);
            };
            
            xhr.onabort = () => {
                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;
                const error = new Error('Request was aborted');
                error.type = 'abort';
                
                if (!logger) initializeLogger();
                logger.logApiCall('POST', TRACKER_CONFIG.apiEndpoint, 0, duration, {
                    eventType: data.event_type || data.eventType,
                    visitorId: data.visitor_id || data.visitorId,
                    attempt: retryCount + 1,
                    aborted: true
                });
                
                handleRequestError(error, data, retryCount, resolve, reject);
            };
            
            try {
                xhr.open("POST", TRACKER_CONFIG.apiEndpoint, true);
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.send(JSON.stringify(data));
                
                logTrackingEvent('attempt', {
                    attempt: retryCount + 1,
                    eventType: data.event_type || data.eventType,
                    visitorId: data.visitor_id || data.visitorId,
                    endpoint: TRACKER_CONFIG.apiEndpoint
                });
            } catch (error) {
                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;
                error.type = 'send';
                
                if (!logger) initializeLogger();
                logger.logApiCall('POST', TRACKER_CONFIG.apiEndpoint, 0, duration, {
                    eventType: data.event_type || data.eventType,
                    visitorId: data.visitor_id || data.visitorId,
                    attempt: retryCount + 1,
                    sendError: true,
                    error: error.message
                });
                
                handleRequestError(error, data, retryCount, resolve, reject);
            }
        });
    };
    
    // Ã¢Å“â€¦ Handle request errors with retry logic
    const handleRequestError = (error, data, retryCount, resolve, reject) => {
        const shouldRetry = retryCount < TRACKER_CONFIG.retryAttempts && isRetryableError(error);
        
        logTrackingEvent('error', {
            error: error.message,
            type: error.type,
            status: error.status,
            attempt: retryCount + 1,
            willRetry: shouldRetry,
            eventType: data.event_type || data.eventType,
            visitorId: data.visitor_id || data.visitorId
        });
        
        if (shouldRetry) {
            const delay = TRACKER_CONFIG.retryDelay * Math.pow(2, retryCount); // Exponential backoff
            setTimeout(() => {
                sendTrackingData(data, retryCount + 1)
                    .then(resolve)
                    .catch(reject);
            }, delay);
        } else {
            reject({
                error,
                attempts: retryCount + 1,
                data
            });
        }
    };
    
    // Ã¢Å“â€¦ Determine if an error is retryable
    const isRetryableError = (error) => {
        // Retry on network errors, timeouts, and certain HTTP status codes
        if (error.type === 'network' || error.type === 'timeout') {
            return true;
        }
        
        if (error.type === 'http' && error.status) {
            // Retry on server errors (5xx) and rate limiting (429)
            return error.status >= 500 || error.status === 429;
        }
        
        return false;
    };
    
    // Ã¢Å“â€¦ Initialize structured logger for tracking script
    let logger = null;
    
    function initializeLogger() {
        if (typeof window !== 'undefined' && window.TrackingLogger) {
            logger = window.TrackingLogger.createLogger('tracking-script', {
                enableDebug: window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' || 
                           window.location.search.includes('debug=true') ||
                           window.TRACKER_DEBUG === true
            });
        } else {
            // Fallback logger if structured logging is not available
            logger = {
                debug: function(msg, data) { console.log('[TRACKER DEBUG]', msg, data); },
                info: function(msg, data) { console.log('[TRACKER INFO]', msg, data); },
                warn: function(msg, data) { console.warn('[TRACKER WARN]', msg, data); },
                error: function(msg, error, data) { console.error('[TRACKER ERROR]', msg, error, data); },
                logApiCall: function(method, url, status, duration, data) {
                    console.log('[TRACKER API]', method, url, status, duration + 'ms', data);
                },
                logConsentEvent: function(type, category, value, data) {
                    console.log('[TRACKER CONSENT]', type, category, value, data);
                }
            };
        }
    }

    // Ã¢Å“â€¦ Enhanced logging function for tracking events with structured logging
    const logTrackingEvent = (level, details) => {
        if (!logger) initializeLogger();
        
        const eventData = {
            eventType: details.eventType,
            visitorId: details.visitorId,
            attempt: details.attempt,
            maxAttempts: TRACKER_CONFIG.retryAttempts,
            endpoint: details.endpoint,
            duration: details.duration,
            status: details.status,
            willRetry: details.willRetry,
            error: details.error,
            errorType: details.type
        };

        switch (level) {
            case 'success':
                logger.info('Successfully sent tracking event', eventData);
                break;
            case 'error':
                logger.error('Failed to send tracking event', 
                    details.error ? new Error(details.error) : null, 
                    eventData);
                break;
            case 'attempt':
                logger.debug('Sending tracking event', eventData);
                break;
            case 'final_error':
                logger.error('All retry attempts failed for tracking event', 
                    details.error ? new Error(details.error) : null, 
                    eventData);
                break;
            case 'info':
                logger.info(details.message || 'Tracking event info', eventData);
                break;
            default:
                logger.debug(`Tracking event: ${level}`, eventData);
        }
    };

    // Ã¢Å“â€¦ Generate a Temporary UUID for Essential Tracking
    const generateVisitorId = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // Ã¢Å“â€¦ Generate Session ID
    const generateSessionId = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // Ã¢Å“â€¦ Get or create session ID
    const getSessionId = () => {
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = generateSessionId();
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    };

    // Ã¢Å“â€¦ Store visitor ID in sessionStorage (before consent)
    const getVisitorId = () => {
        // First, check for ref parameter in URL - if present, use it as visitorId
        const refValue = new URLSearchParams(window.location.search).get('ref');
        
        // If refValue exists and is valid, use it as visitorId
        if (refValue && refValue.trim() !== '') {
            // Always store refValue as visitorId in sessionStorage
            sessionStorage.setItem(TRACKER_CONFIG.visitorIdKey, refValue);
            
            // Only save to localStorage if marketing consent is granted
            // Read consent directly from localStorage to avoid infinite recursion
            var consent = JSON.parse(localStorage.getItem('userConsent') || '{}');
            var hasMarketingConsent = consent.marketing === true;
            
            if (hasMarketingConsent) {
                localStorage.setItem(TRACKER_CONFIG.visitorIdKey, refValue);
            }
            
            if (!logger) initializeLogger();
            logger.info('Using refValue as visitorId', {
                refValue: refValue,
                source: 'URL parameter',
                savedToLocalStorage: hasMarketingConsent
            });
            
            return refValue;
        }
        
        // Check localStorage for existing visitor ID only if marketing consent is granted
        // Read consent directly from localStorage to avoid infinite recursion
        let visitorId = null;
        var consent = JSON.parse(localStorage.getItem('userConsent') || '{}');
        var hasMarketingConsent = consent.marketing === true;
        
        if (hasMarketingConsent) {
            visitorId = localStorage.getItem(TRACKER_CONFIG.visitorIdKey);
            
            // If visitor ID exists in localStorage, use it and also store in sessionStorage for consistency
            if (visitorId) {
                sessionStorage.setItem(TRACKER_CONFIG.visitorIdKey, visitorId);
                return visitorId;
            }
        }
        
        // If no visitor ID in localStorage (or marketing consent not granted), check sessionStorage
        visitorId = sessionStorage.getItem(TRACKER_CONFIG.visitorIdKey);
        
        if (!visitorId) {
            // Generate new visitor ID only if none exists anywhere
            visitorId = generateVisitorId();
            sessionStorage.setItem(TRACKER_CONFIG.visitorIdKey, visitorId);
        }
        
        return visitorId;
    };

    // Ã¢Å“â€¦ Get or set first landing URL
    const getFirstLandingURL = () => {
        let firstLandingURL = sessionStorage.getItem(TRACKER_CONFIG.firstLandingURLKey);
        if (!firstLandingURL) {
            firstLandingURL = window.location.href;
            sessionStorage.setItem(TRACKER_CONFIG.firstLandingURLKey, firstLandingURL);
        }
        return firstLandingURL;
    };

    // Ã¢Å“â€¦ Store marketing data in separate session storage
    function storeMarketingData(marketingData) {
        var existingData = JSON.parse(sessionStorage.getItem(TRACKER_CONFIG.marketingDataKey) || '{}');
        var updatedData = Object.assign({}, existingData, marketingData);
        sessionStorage.setItem(TRACKER_CONFIG.marketingDataKey, JSON.stringify(updatedData));
        
        if (!logger) initializeLogger();
        logger.debug('Marketing data stored in session storage', {
            dataKeys: Object.keys(marketingData),
            totalKeys: Object.keys(updatedData).length
        });
    }

    // Ã¢Å“â€¦ Store analytics data in separate session storage
    function storeAnalyticsData(analyticsData) {
        var existingData = JSON.parse(sessionStorage.getItem(TRACKER_CONFIG.analyticsDataKey) || '{}');
        var updatedData = Object.assign({}, existingData, analyticsData);
        sessionStorage.setItem(TRACKER_CONFIG.analyticsDataKey, JSON.stringify(updatedData));
        
        if (!logger) initializeLogger();
        logger.debug('Analytics data stored in session storage', {
            dataKeys: Object.keys(analyticsData),
            totalKeys: Object.keys(updatedData).length
        });
    }

    // Ã¢Å“â€¦ Get stored marketing data
    function getStoredMarketingData() {
        return JSON.parse(sessionStorage.getItem(TRACKER_CONFIG.marketingDataKey) || '{}');
    }

    // Ã¢Å“â€¦ Get stored analytics data
    function getStoredAnalyticsData() {
        return JSON.parse(sessionStorage.getItem(TRACKER_CONFIG.analyticsDataKey) || '{}');
    }

    // Ã¢Å“â€¦ Include/exclude stored consent-based data in session/local storage based on consent
    function sendStoredConsentData() {
        var marketingData = getStoredMarketingData();
        var analyticsData = getStoredAnalyticsData();
        var firstLandingURL = getFirstLandingURL();
        
        // Include marketing data in main tracking data if consent is granted
        if (hasConsent('marketing') && Object.keys(marketingData).length > 0) {
            var mainTrackingData = getTrackingData();
            var combinedMarketingData = Object.assign({}, mainTrackingData, marketingData);
            updateTrackingData(combinedMarketingData);
            
            if (!logger) initializeLogger();
            logger.info('Marketing data included in tracking data - consent granted', {
                dataKeys: Object.keys(marketingData),
                firstLandingURL: firstLandingURL
            });
        } else if (!hasConsent('marketing')) {
            // Remove marketing data from main tracking data if consent is withdrawn
            var mainTrackingData = getTrackingData();
            var marketingFields = ['gclid', 'dclid', 'gbraid', 'fbclid', 'li_fat_id', 'msclkid',
                                  'googleTrackingId', 'clickId', 'bingTrackingId', 'utmSource', 'network',
                                  'matchType', 'adPosition'];
            
            marketingFields.forEach(function(field) {
                if (mainTrackingData[field] !== undefined) {
                    delete mainTrackingData[field];
                }
            });
            
            updateTrackingData(mainTrackingData);
            
            if (!logger) initializeLogger();
            logger.info('Marketing data excluded from tracking data - no consent', {
                removedFields: marketingFields.filter(function(field) { return marketingData[field] !== undefined; }),
                firstLandingURL: firstLandingURL
            });
        }
        
        // Include analytics data in main tracking data if consent is granted
        if (hasConsent('analytics') && Object.keys(analyticsData).length > 0) {
            var mainTrackingData = getTrackingData();
            var combinedAnalyticsData = Object.assign({}, mainTrackingData, analyticsData);
            updateTrackingData(combinedAnalyticsData);
            
            if (!logger) initializeLogger();
            logger.info('Analytics data included in tracking data - consent granted', {
                dataKeys: Object.keys(analyticsData),
                firstLandingURL: firstLandingURL
            });
        } else if (!hasConsent('analytics')) {
            // Remove analytics data from main tracking data if consent is withdrawn
            var mainTrackingData = getTrackingData();
            var analyticsFields = ['screenWidth', 'screenHeight', 'colorDepth', 'viewportWidth', 'viewportHeight', 
                                  'connection', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                                  'sessionDuration', 'pageLoadTime', 'scrollDepth', 'fullURL'];
            
            analyticsFields.forEach(function(field) {
                if (mainTrackingData[field] !== undefined) {
                    delete mainTrackingData[field];
                }
            });
            
            updateTrackingData(mainTrackingData);
            
            if (!logger) initializeLogger();
            logger.info('Analytics data excluded from tracking data - no consent', {
                removedFields: analyticsFields.filter(function(field) { return analyticsData[field] !== undefined; }),
                firstLandingURL: firstLandingURL
            });
        }
    }

    // Ã¢Å“â€¦ Get browser information
    function getBrowserInfo() {
        var ua = navigator.userAgent;
        var browser = "Unknown";
        var operatingSystem = "Unknown";
        var platform = navigator.platform;

        // Detect browser
        if (ua.indexOf("Firefox") > -1) {
            browser = "Firefox";
        } else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) {
            browser = "Safari";
        } else if (ua.indexOf("Chrome") > -1) {
            browser = "Chrome";
        } else if (ua.indexOf("Edge") > -1) {
            browser = "Edge";
        } else if (ua.indexOf("MSIE") > -1 || ua.indexOf("Trident") > -1) {
            browser = "Internet Explorer";
        }

        // Detect operating system
        if (ua.indexOf("Windows") > -1) {
            operatingSystem = "Windows";
        } else if (ua.indexOf("Mac") > -1) {
            operatingSystem = "MacOS";
        } else if (ua.indexOf("Linux") > -1) {
            operatingSystem = "Linux";
        } else if (ua.indexOf("Android") > -1) {
            operatingSystem = "Android";
        } else if (ua.indexOf("iOS") > -1) {
            operatingSystem = "iOS";
        }

        return {
            browser: browser,
            operatingSystem: operatingSystem,
            platform: platform,
            userAgent: ua
        };
    }

    // Ã¢Å“â€¦ Get screen and viewport information
    function getScreenInfo() {
        return {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            colorDepth: window.screen.colorDepth,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        };
    }

    // Ã¢Å“â€¦ Get connection information
    function getConnectionInfo() {
        var connectionType = "Unknown";
        if (navigator.connection) {
            if (navigator.connection.effectiveType) {
                connectionType = navigator.connection.effectiveType;
            } else if (navigator.connection.type) {
                connectionType = navigator.connection.type;
            }
        }
        return { type: connectionType };
    }

    // Ã¢Å“â€¦ Get referrer information
    function getReferrerInfo() {
        var referrer = document.referrer || "direct";
        var referrerDomain = "direct";
        var referralPath = "";

        if (referrer !== "direct") {
            try {
                var url = new URL(referrer);
                referrerDomain = url.hostname;
                referralPath = url.pathname;
            } catch (e) {
                referrerDomain = referrer.split('/')[2] || "direct";
            }
        }

        return {
            referrer: referrer,
            referrerDomain: referrerDomain,
            referralPath: referralPath
        };
    }

    // Ã¢Å“â€¦ Get timezone offset
    function getTimezoneOffset() {
        return new Date().getTimezoneOffset();
    }

    // Ã¢Å“â€¦ Check if cookies are enabled
    function isCookieEnabled() {
        return navigator.cookieEnabled;
    }

    // Ã¢Å“â€¦ Check do not track setting
    function getDoNotTrack() {
        return navigator.doNotTrack || window.doNotTrack || "0";
    }

    // Ã¢Å“â€¦ Hash IP address (placeholder - would need server-side implementation)
    function getHashedIpAddress() {
        // This would typically be done server-side
        // For now, return a placeholder
        return "";
    }

    // Ã¢Å“â€¦ Get home_id from URL parameters or page metadata
    function getHomeId() {
        const params = new URLSearchParams(window.location.search);
        // Check URL params first
        if (params.has('home_id')) {
            return params.get('home_id');
        }
        // Check for data attributes or meta tags as fallback
        const homeIdMeta = document.querySelector('meta[name="home_id"]');
        if (homeIdMeta) {
            return homeIdMeta.getAttribute('content');
        }
        return null;
    }

    // Ã¢Å“â€¦ Consolidate all click IDs into single click_id field (priority: gclid > dclid > msclkid > fbclid > li_fat_id)
    function consolidateClickIds(trackingParams) {
        if (trackingParams.gclid) return trackingParams.gclid;
        if (trackingParams.dclid) return trackingParams.dclid;
        if (trackingParams.msclkid) return trackingParams.msclkid;
        if (trackingParams.fbclid) return trackingParams.fbclid;
        if (trackingParams.li_fat_id) return trackingParams.li_fat_id;
        return null;
    }

    // Ã¢Å“â€¦ Build attribution JSON object with all tracking data (respects consent)
    function buildAttributionObject(data, params) {
        const attribution = {
            // Referrer data (essential - always included)
            referrer: data.referrer || null,
            referrer_domain: data.referrer_domain || null,
            referral_path: data.referral_path || null
        };

        // UTM parameters - include only if analytics consent is given
        if (hasConsent('analytics')) {
            attribution.utm_source = params.get('utm_source') || data.utm_source || null;
            attribution.utm_medium = params.get('utm_medium') || data.utm_medium || null;
            attribution.utm_campaign = params.get('utm_campaign') || data.utm_campaign || null;
            attribution.utm_term = params.get('utm_term') || data.utm_term || null;
            attribution.utm_content = params.get('utm_content') || data.utm_content || null;
        }

        // Marketing tracking data - include only if marketing consent is given
        if (hasConsent('marketing')) {
            attribution.click_id = data.click_id || null;
            attribution.google_tracking_id = data.google_tracking_id || null;
            attribution.bing_tracking_id = data.bing_tracking_id || null;
            attribution.dclid = data.dclid || null;
            attribution.network = data.network || null;
            attribution.match_type = data.match_type || null;
            attribution.ad_position = data.ad_position || null;
            // Original click IDs (for reference)
            attribution.gclid = data.gclid || null;
            attribution.msclkid = data.msclkid || null;
            attribution.fbclid = data.fbclid || null;
            attribution.li_fat_id = data.li_fat_id || null;
        }

        // Remove null values
        return Object.fromEntries(Object.entries(attribution).filter(([_, v]) => v !== null));
    }

    // Ã¢Å“â€¦ Filter tracking data based on consent before sending
    function filterTrackingDataByConsent(data) {
        const filtered = Object.assign({}, data);
        
        // Marketing fields that should be excluded without marketing consent
        // Note: click_id is NOT included here - it's considered essential for attribution tracking
        const marketingFields = [
            'gclid', 'dclid', 'gbraid', 'fbclid', 'li_fat_id', 'msclkid',
            'google_tracking_id', 'googleTrackingId',
            'bing_tracking_id', 'bingTrackingId', 'network', 'match_type',
            'matchType', 'ad_position', 'adPosition'
        ];
        
        // Analytics fields that should be excluded without analytics consent
        const analyticsFields = [
            'screen_width', 'screenWidth', 'screen_height', 'screenHeight',
            'color_depth', 'colorDepth', 'viewport_width', 'viewportWidth',
            'viewport_height', 'viewportHeight', 'connection',
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'sessionDuration', 'pageLoadTime', 'scrollDepth'
        ];
        
        // Remove marketing fields if marketing consent not given
        if (!hasConsent('marketing')) {
            marketingFields.forEach(function(field) {
                delete filtered[field];
            });
            
            // Also clean attribution object if it contains marketing data
            // Note: click_id is preserved - it's considered essential for attribution tracking
            if (filtered.attribution && typeof filtered.attribution === 'object') {
                const cleanAttribution = Object.assign({}, filtered.attribution);
                ['google_tracking_id', 'bing_tracking_id', 'dclid','network', 'match_type', 'ad_position', 'gclid', 'msclkid',
                 'fbclid', 'li_fat_id'].forEach(function(field) {
                    delete cleanAttribution[field];
                });
                filtered.attribution = cleanAttribution;
            }
        }
        
        // Remove analytics fields if analytics consent not given
        if (!hasConsent('analytics')) {
            analyticsFields.forEach(function(field) {
                delete filtered[field];
            });
            
            // Also clean attribution object if it contains analytics data
            if (filtered.attribution && typeof filtered.attribution === 'object') {
                const cleanAttribution = Object.assign({}, filtered.attribution);
                ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function(field) {
                    delete cleanAttribution[field];
                });
                filtered.attribution = cleanAttribution;
            }
        }
        
        return filtered;
    }

    // Ã¢Å“â€¦ Normalize field names from camelCase to snake_case
    function normalizeFieldNames(data) {
        const normalized = {};
        const fieldMapping = {
            screenWidth: 'screen_width',
            screenHeight: 'screen_height',
            colorDepth: 'color_depth',
            viewportWidth: 'viewport_width',
            viewportHeight: 'viewport_height',
            timezoneOffset: 'timezone_offset',
            cookieEnabled: 'cookie_enabled',
            doNotTrack: 'do_not_track',
            googleTrackingId: 'google_tracking_id',
            bingTrackingId: 'bing_tracking_id',
            phoneNumberDisplayed: 'phone_number_displayed',
            referrerDomain: 'referrer_domain',
            referralPath: 'referral_path',
            operatingSystem: 'operating_system',
            userAgent: 'user_agent',
            actionTimestamp: 'action_timestamp',
            eventType: 'event_type',
            sessionId: 'session_id',
            visitorId: 'visitor_id',
            customerId: 'customer_id',
            homeId: 'home_id',
            hashedIpAddress: 'hashed_ip_address',
            createdAt: 'created_at'
        };

        for (const [key, value] of Object.entries(data)) {
            const normalizedKey = fieldMapping[key] || key;
            normalized[normalizedKey] = value;
        }

        return normalized;
    }

    // Ã¢Å“â€¦ Helper function to check if a URL is external
    function isExternalLink(url) {
        if (!url || typeof url !== 'string') return false;
        
        // Skip non-http protocols
        if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:') || url.startsWith('#')) {
            return false;
        }
        
        try {
            // Handle relative URLs
            if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../') || !url.includes('://')) {
                return false;
            }
            
            const linkUrl = new URL(url);
            const currentHostname = window.location.hostname.toLowerCase();
            const linkHostname = linkUrl.hostname.toLowerCase();
            
            // Only exact hostname match is considered internal (including subdomain)
            // Subdomains are treated as external links
            return linkHostname !== currentHostname && linkHostname !== '';
        } catch (e) {
            // If URL parsing fails, assume it's not external
            return false;
        }
    }

    // Ã¢Å“â€¦ Helper function to add query parameter to URL safely
    function addQueryParam(url, paramName, paramValue) {
        if (!url || !paramName || !paramValue) return url;
        
        try {
            const urlObj = new URL(url, window.location.origin);
            const existingValue = urlObj.searchParams.get(paramName);
            
            // If ref parameter already exists, don't add it again
            if (existingValue !== null) {
                return url;
            }
            
            urlObj.searchParams.set(paramName, paramValue);
            return urlObj.toString();
        } catch (e) {
            // If URL parsing fails, return original URL
            if (!logger) initializeLogger();
            logger.warn('Failed to add query parameter to URL', {
                url: url,
                paramName: paramName,
                error: e.message
            });
            return url;
        }
    }

    // Ã¢Å“â€¦ Add ref parameter to external links
    function addRefToExternalLinks() {
        if (!TRACKER_CONFIG.enableRefTracking) {
            return;
        }
        
        const visitorId = getVisitorId();
        if (!visitorId) {
            if (!logger) initializeLogger();
            logger.warn('Cannot add ref parameter: visitorId is not available');
            return;
        }
        
        const links = document.querySelectorAll('a[href]');
        let processedCount = 0;
        let skippedCount = 0;
        
        links.forEach((link) => {
            const href = link.getAttribute('href');
            
            // Check if it's an external link
            if (!isExternalLink(href)) {
                skippedCount++;
                return;
            }
            
            // Check if ref parameter already exists
            try {
                const urlObj = new URL(href, window.location.origin);
                if (urlObj.searchParams.has('ref')) {
                    skippedCount++;
                    return;
                }
            } catch (e) {
                // Skip if URL parsing fails
                skippedCount++;
                return;
            }
            
            // Add ref parameter
            const newHref = addQueryParam(href, 'ref', visitorId);
            if (newHref !== href) {
                link.setAttribute('href', newHref);
                processedCount++;
            } else {
                skippedCount++;
            }
        });
        
        if (!logger) initializeLogger();
        if (processedCount > 0 || skippedCount > 0) {
            logger.debug('Ref parameter injection completed', {
                processed: processedCount,
                skipped: skippedCount,
                total: links.length,
                visitorId: visitorId
            });
        }
    }

    // Ã¢Å“â€¦ MutationObserver to handle dynamically added links
    let refTrackingObserver = null;
    
    function initRefTrackingObserver() {
        if (!TRACKER_CONFIG.enableRefTracking) {
            return;
        }
        
        // Clean up existing observer if any
        if (refTrackingObserver) {
            refTrackingObserver.disconnect();
        }
        
        // Debounce function for performance
        let debounceTimer = null;
        const debouncedAddRef = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                addRefToExternalLinks();
            }, 100);
        };
        
        // Create MutationObserver
        refTrackingObserver = new MutationObserver((mutations) => {
            let shouldProcess = false;
            
            for (const mutation of mutations) {
                // Check for added nodes
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        // Check if added node is a link or contains links
                        if (node.nodeType === 1) { // Element node
                            if (node.tagName === 'A' && node.hasAttribute('href')) {
                                shouldProcess = true;
                                break;
                            } else if (node.querySelectorAll && node.querySelectorAll('a[href]').length > 0) {
                                shouldProcess = true;
                                break;
                            }
                        }
                    }
                }
                
                // Check for attribute changes on links
                if (mutation.type === 'attributes' && 
                    mutation.target.tagName === 'A' && 
                    mutation.attributeName === 'href') {
                    shouldProcess = true;
                    break;
                }
            }
            
            if (shouldProcess) {
                debouncedAddRef();
            }
        });
        
        // Start observing - wait for body if needed
        if (document.body) {
            refTrackingObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['href']
            });
            
            if (!logger) initializeLogger();
            logger.debug('Ref tracking MutationObserver initialized');
        } else {
            // Wait for body to be available
            const bodyCheckInterval = setInterval(() => {
                if (document.body) {
                    clearInterval(bodyCheckInterval);
                    refTrackingObserver.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['href']
                    });
                    
                    if (!logger) initializeLogger();
                    logger.debug('Ref tracking MutationObserver initialized (delayed)');
                }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(bodyCheckInterval);
            }, 10000);
        }
    }

    // Ã¢Å“â€¦ Initialize ref tracking
    function initRefTracking() {
        if (!TRACKER_CONFIG.enableRefTracking) {
            if (!logger) initializeLogger();
            logger.debug('Ref tracking is disabled');
            return;
        }
        
        // Process existing links when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                addRefToExternalLinks();
                initRefTrackingObserver();
            });
        } else {
            // DOM is already loaded
            addRefToExternalLinks();
            initRefTrackingObserver();
        }
        
        if (!logger) initializeLogger();
        logger.info('Ref tracking initialized', {
            enabled: TRACKER_CONFIG.enableRefTracking,
            visitorId: getVisitorId()
        });
    }

    // Ã¢Å“â€¦ Expose TRACKER_CONFIG as window.TRACKER_360_CONFIG with reactivity
    (function() {
        // Create a proxy to make TRACKER_CONFIG reactive and accessible via window
        const configProxy = new Proxy(TRACKER_CONFIG, {
            get: function(target, prop) {
                return target[prop];
            },
            set: function(target, prop, value) {
                target[prop] = value;
                
                // If enableRefTracking changes, reinitialize observer
                if (prop === 'enableRefTracking') {
                    if (value) {
                        initRefTracking();
                    } else {
                        if (refTrackingObserver) {
                            refTrackingObserver.disconnect();
                            refTrackingObserver = null;
                        }
                    }
                }
                
                return true;
            }
        });
        
        // Expose via window
        window.TRACKER_360_CONFIG = configProxy;
    })();

    // Ã¢Å“â€¦ Analytics helper functions
    function getSessionDuration() {
        var sessionStart = sessionStorage.getItem('sessionStartTime');
        if (!sessionStart) {
            sessionStart = Date.now();
            sessionStorage.setItem('sessionStartTime', sessionStart);
            return 0;
        }
        return Math.floor((Date.now() - parseInt(sessionStart)) / 1000); // Duration in seconds
    }

    function getPageLoadTime() {
        if (window.performance && window.performance.timing) {
            var loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
            return loadTime > 0 ? loadTime : 0;
        }
        return 0;
    }

    function getScrollDepth() {
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var documentHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
        var windowHeight = window.innerHeight;
        var scrollDepth = Math.round(((scrollTop + windowHeight) / documentHeight) * 100);
        return Math.min(scrollDepth, 100); // Cap at 100%
    }

    // Ã¢Å“â€¦ Detect Device Type

    function getDeviceType() {

        var ua = navigator.userAgent;

        if (/mobile/i.test(ua)) return "mobile";

        if (/tablet/i.test(ua)) return "tablet";

        return "desktop"; // Default to desktop

    }

    // Ã¢Å“â€¦ Save user consent preferences & persist Visitor ID - Enhanced for Requirement 5.4 & 5.5
    
    // Re-entrancy guard to prevent recursion during consent sync
    var _consentSyncInProgress = false;

    function setConsentCategory(category, value) {
        var previousConsent = JSON.parse(localStorage.getItem('userConsent') || '{}');
        var previousValue = previousConsent[category];

        var consent = JSON.parse(localStorage.getItem('userConsent') || '{}');
        consent[category] = value;
        
        // Store timestamp when consent is set
        if (!consent.timestamp) {
            consent.timestamp = new Date().toISOString();
        }
        // Update timestamp if consent changes
        if (previousValue !== value) {
            consent.timestamp = new Date().toISOString();
        }
        
        localStorage.setItem('userConsent', JSON.stringify(consent));

        // Move visitor ID from sessionStorage to localStorage only if marketing consent is granted
        // Skip this during consent sync to avoid recursion (getVisitorId reads consent)
        if (!_consentSyncInProgress) {
            var visitorId = getVisitorId();
            if (consent.marketing === true) {
                // Save to localStorage only when marketing consent is granted
                localStorage.setItem(TRACKER_CONFIG.visitorIdKey, visitorId);
            } else {
                // Remove from localStorage if marketing consent is not granted
                localStorage.removeItem(TRACKER_CONFIG.visitorIdKey);
            }
        }

        // Handle consent changes - Requirement 5.4 & 5.5
        if (previousValue !== value && !_consentSyncInProgress) {
            handleConsentChange(category, value, previousValue);
        }
    }

    // Ã¢Å“â€¦ Handle consent changes - Requirement 5.4 & 5.5
    // Track last consent state to prevent unnecessary re-processing
    var lastConsentState = {
        analytics: null,
        marketing: null
    };

    function handleConsentChange(category, newValue, previousValue) {
        if (!logger) initializeLogger();
        
        // Ã¢Å“â€¦ Guard: Prevent processing if consent state hasn't actually changed
        if (lastConsentState[category] === newValue) {
            logger.debug('Consent state unchanged, skipping processing', {
                category: category,
                value: newValue
            });
            return;
        }
        
        // Update last known consent state
        lastConsentState[category] = newValue;
        
        logger.logConsentEvent('change', category, newValue, {
            previousValue: previousValue,
            timestamp: new Date().toISOString(),
            visitorId: getVisitorId()
        });

        // If consent was granted, merge stored data into main tracking data
        // Data will be sent together with next essential event (page view, click, etc.)
        if (newValue === true && previousValue === false) {
            logger.info('Consent granted, merging stored data into main tracking data', {
                category: category,
                action: 'merge_stored_data'
            });
            
            // Merge stored data into main tracking data (no separate send)
            sendStoredConsentData();
            
            // Only initialize if not already initialized
            if (category === 'analytics' && !analyticsTrackingInitialized) {
                initAnalyticsTracking();
            } else if (category === 'marketing' && !marketingTrackingInitialized) {
                initMarketingTracking();
            } else {
                // If already initialized, just merge the data
                if (category === 'analytics') {
                    sendAnalyticsData(); // This now only merges data, doesn't send separately
                } else if (category === 'marketing') {
                    sendMarketingData(); // This now only merges data, doesn't send separately
                }
            }
        }

        // If consent was withdrawn, stop collecting non-essential data immediately - Requirement 5.5
        if (newValue === false && previousValue === true) {
            logger.warn('Consent withdrawn, clearing data collection', {
                category: category,
                action: 'clear_data'
            });
            
            if (category === 'analytics') {
                clearAnalyticsData();
                // Reset initialization flag so it can be re-initialized if consent is granted again
                analyticsTrackingInitialized = false;
            } else if (category === 'marketing') {
                clearMarketingData();
                // Reset initialization flag so it can be re-initialized if consent is granted again
                marketingTrackingInitialized = false;
            }
        }

        // Send consent change event
        sendConsentChangeEvent(category, newValue, previousValue);
    }

    // Ã¢Å“â€¦ Clear analytics data when consent is withdrawn - Requirement 5.5
    function clearAnalyticsData() {
        if (!logger) initializeLogger();
        var startTime = Date.now();
        
        var data = JSON.parse(sessionStorage.getItem(TRACKER_CONFIG.sessionDataKey) || '{}');
        var localData = JSON.parse(localStorage.getItem(TRACKER_CONFIG.sessionDataKey) || '{}');

        // Remove analytics-specific fields
        var analyticsFields = ['screenWidth', 'screenHeight', 'colorDepth', 'viewportWidth', 'viewportHeight', 
                              'connection', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                              'sessionDuration', 'pageLoadTime', 'scrollDepth', 'fullURL'];

        var clearedFields = [];
        analyticsFields.forEach(function(field) {
            if (data[field] !== undefined || localData[field] !== undefined) {
                clearedFields.push(field);
            }
            delete data[field];
            delete localData[field];
        });

        sessionStorage.setItem(TRACKER_CONFIG.sessionDataKey, JSON.stringify(data));
        localStorage.setItem(TRACKER_CONFIG.sessionDataKey, JSON.stringify(localData));

        var duration = Date.now() - startTime;
        logger.info('Analytics data cleared due to consent withdrawal', {
            eventType: 'analytics_data_cleared',
            clearedFields: clearedFields,
            fieldCount: clearedFields.length,
            duration: duration,
            visitorId: getVisitorId()
        });
    }

    // Ã¢Å“â€¦ Clear marketing data when consent is withdrawn - Requirement 5.5
    function clearMarketingData() {
        if (!logger) initializeLogger();
        var startTime = Date.now();
        
        var data = JSON.parse(sessionStorage.getItem(TRACKER_CONFIG.sessionDataKey) || '{}');
        var localData = JSON.parse(localStorage.getItem(TRACKER_CONFIG.sessionDataKey) || '{}');

        // Remove marketing-specific fields
        var marketingFields = ['gclid', 'dclid', 'gbraid', 'fbclid', 'li_fat_id', 'msclkid',
                              'googleTrackingId', 'clickId', 'bingTrackingId', 'utmSource', 'network',
                              'matchType', 'adPosition'];

        var clearedFields = [];
        marketingFields.forEach(function(field) {
            if (data[field] !== undefined || localData[field] !== undefined) {
                clearedFields.push(field);
            }
            delete data[field];
            delete localData[field];
        });

        sessionStorage.setItem(TRACKER_CONFIG.sessionDataKey, JSON.stringify(data));
        localStorage.setItem(TRACKER_CONFIG.sessionDataKey, JSON.stringify(localData));

        // Clear stored marketing data from separate session storage
        sessionStorage.removeItem(TRACKER_CONFIG.marketingDataKey);

        var duration = Date.now() - startTime;
        logger.info('Marketing data cleared due to consent withdrawal', {
            eventType: 'marketing_data_cleared',
            clearedFields: clearedFields,
            fieldCount: clearedFields.length,
            duration: duration,
            visitorId: getVisitorId()
        });
    }

    // Ã¢Å“â€¦ Send consent change event
    const sendConsentChangeEvent = (category, newValue, previousValue) => {
        const data = getTrackingData();
        
        // Get consent data
        const consentData = getConsentData();
        
        const trackingData = Object.assign({}, data, {
            event_type: 'consent_change',
            consentCategory: category,
            consentValue: newValue,
            previousConsentValue: previousValue,
            visitor_id: getVisitorId(),
            url: window.location.href,
            action_timestamp: new Date().toISOString()
        });

        // Filter data based on consent before adding consent data
        const filteredData = filterTrackingDataByConsent(trackingData);

        // Add consent data if available
        if (consentData) {
            Object.assign(filteredData, consentData);
        }

        // Normalize field names before sending
        const normalizedData = normalizeFieldNames(filteredData);

        // Send to the tracking endpoint with retry logic
        sendTrackingData(normalizedData)
            .then((result) => {
                // Success - consent change event sent successfully
            })
            .catch((error) => {
                logTrackingEvent('final_error', {
                    error: error.error.message,
                    attempts: error.attempts,
                    eventType: 'consent_change',
                    visitorId: normalizedData.visitor_id
                });
            });
    };

    // Ã¢Å“â€¦ Check if a category is accepted
    // IMPORTANT: This is a pure read operation - no side effects, no external calls
    // Consent syncing happens once at initialization time via syncConsentFromCookie()
    function hasConsent(category) {
        var consent = JSON.parse(localStorage.getItem('userConsent') || '{}');
        return consent[category] === true;
    }

    // Ã¢Å“â€¦ Public functions to manage consent

    window.userConsent = {

        acceptAnalytics: function () { setConsentCategory('analytics', true); },

        rejectAnalytics: function () { setConsentCategory('analytics', false); },

        acceptMarketing: function () { setConsentCategory('marketing', true); },

        rejectMarketing: function () { setConsentCategory('marketing', false); }

    };

    // Ã¢Å“â€¦ Essential Tracking (No Consent Required) - Requirement 5.1
    function collectEssentialData() {
        const data = getTrackingData();
        const browserInfo = getBrowserInfo();
        const referrerInfo = getReferrerInfo();
        const params = new URLSearchParams(window.location.search);

        // Essential data that can be collected without consent
        data.customer_id = parseInt(TRACKER_CONFIG.customId) || null;
        data.uuid = getSessionId();
        data.session_id = getSessionId();
        data.visitor_id = getVisitorId(); // Always include visitor_id
        data.home_id = getHomeId(); // Extract home_id from URL or meta tags
        data.pageViews = (data.pageViews || 0) + 1;
        data.referrer = referrerInfo.referrer;
        data.referrer_domain = referrerInfo.referrerDomain;
        data.referral_path = referrerInfo.referralPath;
        data.user_agent = browserInfo.userAgent;
        data.browser = browserInfo.browser;
        data.operating_system = browserInfo.operatingSystem;
        data.platform = browserInfo.platform;
        data.language = navigator.language;
        data.device = getDeviceType();
        data.action_timestamp = new Date().toISOString();
        data.url = window.location.href;
        data.hashed_ip_address = getHashedIpAddress(); // Placeholder, will be filled server-side
        data.created_at = new Date().toISOString();
        data.firstLandingURL = getFirstLandingURL();
        
        // Ã¢Å“â€¦ Get dynamic phone number from cookie for call tracking
        const dynamicPhoneNumber = getCookie('esale_number_dynamic_every_page');
        if (dynamicPhoneNumber) {
            data.phone_number_displayed = dynamicPhoneNumber.replace(/\s+/g, '');
        }
        
        // Ã¢Å“â€¦ Extract ad click IDs from URL (gclid, dclid, msclkid, fbclid, li_fat_id, gbraid)
        var essentialClickIds = {};
        var essentialClickIdParams = ['gclid', 'dclid', 'gbraid', 'msclkid', 'fbclid', 'li_fat_id'];
        for (var j = 0; j < essentialClickIdParams.length; j++) {
            var clickParam = essentialClickIdParams[j];
            if (params.has(clickParam)) {
                essentialClickIds[clickParam] = params.get(clickParam);
                data[clickParam] = params.get(clickParam); // Store individual click IDs
            }
        }
        // Consolidate to single click_id (priority: gclid > dclid > msclkid > fbclid > li_fat_id)
        var essentialClickId = consolidateClickIds(essentialClickIds);
        if (essentialClickId) {
            data.click_id = essentialClickId;
        }
        
        // Ã¢Å“â€¦ Extract Google Ads campaign ID if present
        if (params.has('gad_campaignid')) {
            data.google_tracking_id = params.get('gad_campaignid');
        }

        // Browser settings (essential)
        data.timezone_offset = getTimezoneOffset();
        data.cookie_enabled = isCookieEnabled();
        data.do_not_track = getDoNotTrack();

        // Only include screen info if analytics consent is given - Requirement 5.2
        if (hasConsent('analytics')) {
            const screenInfo = getScreenInfo();
            data.screen_width = screenInfo.screenWidth;
            data.screen_height = screenInfo.screenHeight;
            data.color_depth = screenInfo.colorDepth;
            data.viewport_width = screenInfo.viewportWidth;
            data.viewport_height = screenInfo.viewportHeight;
            data.connection = getConnectionInfo();
        }

        // Build attribution object with all tracking data
        data.attribution = buildAttributionObject(data, params);

        updateTrackingData(data);
    }

    // Ã¢Å“â€¦ Generic Click Tracking - Replaced with consent-aware version
    // This function is now handled by trackGenericClickWithConsent

    function sendEssentialData() {
        const data = JSON.parse(sessionStorage.getItem(TRACKER_CONFIG.sessionDataKey) || '{}');

        // Ã¢Å“â€¦ Include marketing data if consent is granted
        if (hasConsent('marketing')) {
            const marketingData = getStoredMarketingData();
            if (Object.keys(marketingData).length > 0) {
                Object.assign(data, marketingData);
            }
        }

        // Ã¢Å“â€¦ Include analytics data if consent is granted
        if (hasConsent('analytics')) {
            const analyticsData = getStoredAnalyticsData();
            if (Object.keys(analyticsData).length > 0) {
                Object.assign(data, analyticsData);
            }
        }

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'essential_pageview', data: data });

        // Get consent data
        const consentData = getConsentData();

        const trackingData = Object.assign({}, data, { 
            event_type: 'essential_pageview', 
            visitor_id: getVisitorId(), // Always include visitor_id
            url: window.location.href, 
            action_timestamp: new Date().toISOString()
        });

        // Filter data based on consent before adding consent data
        const filteredData = filterTrackingDataByConsent(trackingData);

        // Add consent data if available
        if (consentData) {
            Object.assign(filteredData, consentData);
        }

        // Normalize field names before sending
        const normalizedData = normalizeFieldNames(filteredData);

        // Send to the tracking endpoint with retry logic
        sendTrackingData(normalizedData)
            .then((result) => {
                // Success - essential data sent successfully (including marketing/analytics if consent granted)
            })
            .catch((error) => {
                logTrackingEvent('final_error', {
                    error: error.error.message,
                    attempts: error.attempts,
                    eventType: 'essential_pageview',
                    visitorId: normalizedData.visitor_id
                });
            });
    }

    function initEssentialTracking() {

        collectEssentialData();

        sendEssentialData();

    }

    // Ã¢Å“â€¦ Marketing Tracking (Requires Consent) - Requirement 5.3
    function collectMarketingData() {
        const data = getTrackingData();
        const params = new URLSearchParams(window.location.search);
        const marketingData = {};

        // Ã¢Å“â€¦ Store Bing, Google, Facebook, and LinkedIn tracking parameters
        const trackingParams = {};
        const trackingParamNames = ['gclid', 'dclid', 'gbraid', 'fbclid', 'li_fat_id', 'msclkid'];
        for (let i = 0; i < trackingParamNames.length; i++) {
            const param = trackingParamNames[i];
            if (params.has(param)) {
                trackingParams[param] = params.get(param);
                marketingData[param] = params.get(param);
            }
        }

        // Ã¢Å“â€¦ Consolidate all click IDs into single click_id field (priority: gclid > dclid > msclkid > fbclid > li_fat_id)
        const consolidatedClickId = consolidateClickIds(trackingParams);
        if (consolidatedClickId) {
            marketingData.click_id = consolidatedClickId;
        }

        // Ã¢Å“â€¦ Set specific tracking IDs for database compatibility
        marketingData.google_tracking_id = trackingParams.gclid || null;
        marketingData.bing_tracking_id = trackingParams.msclkid || null;
        marketingData.dclid = trackingParams.dclid || null;

        // Ã¢Å“â€¦ Detect Bing & Microsoft Referrals
        const referrer = document.referrer ? document.referrer.split('/')[2] : "direct";
        if (referrer.indexOf("bing.com") !== -1) {
            marketingData.utm_source = "Bing Search";
            marketingData.network = "Bing";
        } else if (referrer.indexOf("microsoft.com") !== -1) {
            marketingData.utm_source = "Microsoft Ads";
            marketingData.network = "Microsoft";
        } else if (referrer.indexOf("google.com") !== -1) {
            marketingData.network = "Google";
        }

        // Ã¢Å“â€¦ Set additional marketing fields
        marketingData.match_type = "";
        marketingData.ad_position = "";
        marketingData.device = getDeviceType();
        marketingData.fullURL = window.location.href;
        marketingData.visitor_id = localStorage.getItem(TRACKER_CONFIG.visitorIdKey) || getVisitorId();
        marketingData.firstLandingURL = getFirstLandingURL();

        // Always store marketing data in separate session storage
        storeMarketingData(marketingData);

        // If consent is granted, also update main tracking data and send immediately
        if (hasConsent('marketing')) {
            logTrackingEvent('info', {
                message: 'Marketing data collected and sent immediately - consent granted',
                eventType: 'marketing_data_collection',
                visitorId: marketingData.visitor_id
            });
            
            // Merge with main tracking data
            const combinedData = Object.assign({}, data, marketingData);
            updateTrackingData(combinedData);
        } else {
            logTrackingEvent('info', {
                message: 'Marketing data stored in session storage - no consent yet',
                eventType: 'marketing_data_storage',
                visitorId: marketingData.visitor_id
            });
        }
    }

    // Ã¢Å“â€¦ Marketing data collection only - data will be included in main events
    // Removed separate sending logic to prevent infinite loops and consolidate with main events
    function sendMarketingData() {
        // This function now only merges marketing data into main tracking data
        // Marketing data will be sent together with essential page view, clicks, etc.
        if (!hasConsent('marketing')) return;

        const data = getTrackingData();
        const marketingData = getStoredMarketingData();

        // Merge marketing data into main tracking data
        if (Object.keys(marketingData).length > 0) {
            const combinedData = Object.assign({}, data, marketingData);
            updateTrackingData(combinedData);
            
            if (!logger) initializeLogger();
            logger.debug('Marketing data merged into main tracking data', {
                dataKeys: Object.keys(marketingData),
                visitorId: getVisitorId()
            });
        }
    }

    // Ã¢Å“â€¦ Analytics Tracking (Requires Consent) - Requirement 5.2
    function collectAnalyticsData() {
        const data = getTrackingData();
        const screenInfo = getScreenInfo();
        const params = new URLSearchParams(window.location.search);
        const analyticsData = {};

        // Analytics-specific data collection (using snake_case)
        analyticsData.screen_width = screenInfo.screenWidth;
        analyticsData.screen_height = screenInfo.screenHeight;
        analyticsData.color_depth = screenInfo.colorDepth;
        analyticsData.viewport_width = screenInfo.viewportWidth;
        analyticsData.viewport_height = screenInfo.viewportHeight;
        analyticsData.connection = getConnectionInfo();
        analyticsData.fullURL = window.location.href;
        analyticsData.firstLandingURL = getFirstLandingURL();
        
        // UTM parameters for analytics
        const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        for (let i = 0; i < utmParams.length; i++) {
            const param = utmParams[i];
            if (params.has(param)) {
                analyticsData[param] = params.get(param);
            }
        }

        // Session and page analytics
        analyticsData.sessionDuration = getSessionDuration();
        analyticsData.pageLoadTime = getPageLoadTime();
        analyticsData.scrollDepth = getScrollDepth();
        analyticsData.visitor_id = localStorage.getItem(TRACKER_CONFIG.visitorIdKey) || getVisitorId();

        // Always store analytics data in separate session storage
        storeAnalyticsData(analyticsData);

        // If consent is granted, also update main tracking data and send immediately
        if (hasConsent('analytics')) {
            logTrackingEvent('info', {
                message: 'Analytics data collected and sent immediately - consent granted',
                eventType: 'analytics_data_collection',
                visitorId: analyticsData.visitor_id
            });
            
            // Merge with main tracking data
            const combinedData = Object.assign({}, data, analyticsData);
            updateTrackingData(combinedData);
        } else {
            logTrackingEvent('info', {
                message: 'Analytics data stored in session storage - no consent yet',
                eventType: 'analytics_data_storage',
                visitorId: analyticsData.visitor_id
            });
        }
    }

    // Ã¢Å“â€¦ Analytics data collection only - data will be included in main events
    // Removed separate sending logic to prevent infinite loops and consolidate with main events
    function sendAnalyticsData() {
        // This function now only merges analytics data into main tracking data
        // Analytics data will be sent together with essential page view, clicks, etc.
        if (!hasConsent('analytics')) return;

        const data = getTrackingData();
        const analyticsData = getStoredAnalyticsData();

        // Merge analytics data into main tracking data
        if (Object.keys(analyticsData).length > 0) {
            const combinedData = Object.assign({}, data, analyticsData);
            updateTrackingData(combinedData);
            
            if (!logger) initializeLogger();
            logger.debug('Analytics data merged into main tracking data', {
                dataKeys: Object.keys(analyticsData),
                visitorId: getVisitorId()
            });
        }
    }

    // Track initialization state to prevent infinite loops
    var analyticsTrackingInitialized = false;
    var marketingTrackingInitialized = false;

    function initAnalyticsTracking() {
        // Prevent re-initialization if already initialized
        if (analyticsTrackingInitialized) {
            if (!logger) initializeLogger();
            logger.debug('Analytics tracking already initialized, skipping re-initialization');
            return;
        }

        // Always collect analytics data, store in separate session storage
        collectAnalyticsData();
        
        // Merge analytics data into main tracking data if consent is granted
        // Data will be sent together with essential events, not separately
        if (hasConsent('analytics')) {
            sendAnalyticsData();
        }
        
        analyticsTrackingInitialized = true;
    }

    function initMarketingTracking() {
        // Prevent re-initialization if already initialized
        if (marketingTrackingInitialized) {
            if (!logger) initializeLogger();
            logger.debug('Marketing tracking already initialized, skipping re-initialization');
            return;
        }

        // Always collect marketing data, store in separate session storage
        collectMarketingData();
        
        // Merge marketing data into main tracking data if consent is granted
        // Data will be sent together with essential events, not separately
        if (hasConsent('marketing')) {
            sendMarketingData();
        }
        
        marketingTrackingInitialized = true;
    }

    // Ã¢Å“â€¦ Track Phone Number Clicks - Enhanced with consent awareness (Dynamic Configuration)
    function trackPhoneClick(event) {
        if (!TRACKER_CONFIG.phoneTrackingConfig.enabled) {
            return;
        }

        const data = getTrackingData();
        const config = TRACKER_CONFIG.phoneTrackingConfig;
        
        // Find matching link using configured selectors
        let link = null;
        for (let i = 0; i < config.selectors.length; i++) {
            link = event.target.closest(config.selectors[i]);
            if (link) break;
        }
        
        // Also check link patterns
        if (!link) {
            const targetLink = event.target.closest('a');
            if (targetLink && targetLink.href) {
                for (let i = 0; i < config.linkPatterns.length; i++) {
                    if (targetLink.href.toLowerCase().startsWith(config.linkPatterns[i].toLowerCase())) {
                        link = targetLink;
                        break;
                    }
                }
            }
        }

        if (link) {
            const phone = link.getAttribute('href').replace('tel:', '');
            const params = new URLSearchParams(window.location.search);
            
            const phoneData = {
                phone_number_displayed: phone.replace(/\s+/g, ''),
                action_timestamp: new Date().toISOString(),
                visitor_id: getVisitorId(), // Always include visitor_id
                firstLandingURL: getFirstLandingURL()
            };

            // Add analytics data if consent is given
            if (hasConsent('analytics')) {
                phoneData.scrollDepth = getScrollDepth();
                phoneData.sessionDuration = getSessionDuration();
                phoneData.pageLoadTime = getPageLoadTime();
            }

            // Add marketing data if consent is given
            if (hasConsent('marketing')) {
                phoneData.url = window.location.href;
                if (params.has('utm_source')) phoneData.utm_source = params.get('utm_source');
                // Consolidate click IDs
                const trackingParams = {};
                if (params.has('gclid')) trackingParams.gclid = params.get('gclid');
                if (params.has('dclid')) trackingParams.dclid = params.get('dclid');
                if (params.has('msclkid')) trackingParams.msclkid = params.get('msclkid');
                if (params.has('fbclid')) trackingParams.fbclid = params.get('fbclid');
                if (params.has('li_fat_id')) trackingParams.li_fat_id = params.get('li_fat_id');
                const clickId = consolidateClickIds(trackingParams);
                if (clickId) phoneData.click_id = clickId;
            }

            window.dataLayer.push({ event: 'phone_click', phone: phone });

            // Get consent data
            const consentData = getConsentData();

            const trackingData = Object.assign({}, data, phoneData, { 
                event_type: "phone_click", 
                visitor_id: getVisitorId(),
                url: window.location.href,
                action_timestamp: new Date().toISOString() 
            });

            // Filter data based on consent before adding consent data
            const filteredData = filterTrackingDataByConsent(trackingData);

            // Add consent data if available
            if (consentData) {
                Object.assign(filteredData, consentData);
            }

            // Normalize field names before sending
            const normalizedData = normalizeFieldNames(filteredData);

            // Send to the tracking endpoint with retry logic
            sendTrackingData(normalizedData)
                .then((result) => {
                    // Success - phone click data sent successfully
                })
                .catch((error) => {
                    logTrackingEvent('final_error', {
                        error: error.error.message,
                        attempts: error.attempts,
                        eventType: 'phone_click',
                        visitorId: normalizedData.visitor_id
                    });
                });
        }
    }

    

    // Ã¢Å“â€¦ Track Form Submissions - Enhanced with consent awareness
    function trackFormSubmission(event) {
        const form = event.target.closest('form');
        const data = getTrackingData();
        if (form) {
            // Log form submission detection
            if (TRACKER_CONFIG.enableLogging) {
                if (!logger) initializeLogger();
                logger.info('Form submission detected', {
                    formId: form.id,
                    formClass: form.className,
                    visitorId: getVisitorId(),
                    url: window.location.href,
                    eventType: 'form_submit'
                });
            }

            const formData = {};
            const formShow = {};
            const elements = form.elements;
            
            // Always collect essential form data
            for (let i = 0; i < elements.length; i++) {
                if (elements[i].name) {
                    if (elements[i].type !== 'hidden') {
                        formShow[elements[i].name] = true;
                    }
                    formData[elements[i].name] = elements[i].value;
                }
            }

            // Log form data collection
            if (TRACKER_CONFIG.enableLogging) {
                if (!logger) initializeLogger();
                logger.debug('Form data collected', {
                    formId: form.id,
                    formClass: form.className,
                    fieldCount: Object.keys(formData).length,
                    fields: Object.keys(formData),
                    visitorId: getVisitorId(),
                    eventType: 'form_submit'
                });
            }

            const params = new URLSearchParams(window.location.search);
            const submissionData = {
                formId: form.id,
                formClass: form.className,
                formShow: formShow,
                action_timestamp: new Date().toISOString(),
                visitor_id: getVisitorId(),
                firstLandingURL: getFirstLandingURL()
            };

            // Add analytics data if consent is given
            if (hasConsent('analytics')) {
                submissionData.scrollDepth = getScrollDepth();
                submissionData.sessionDuration = getSessionDuration();
                submissionData.pageLoadTime = getPageLoadTime();
            }

            // Add marketing data if consent is given
            if (hasConsent('marketing')) {
                submissionData.url = window.location.href;
                if (params.has('utm_source')) submissionData.utm_source = params.get('utm_source');
                // Consolidate click IDs
                const trackingParams = {};
                if (params.has('gclid')) trackingParams.gclid = params.get('gclid');
                if (params.has('dclid')) trackingParams.dclid = params.get('dclid');
                if (params.has('msclkid')) trackingParams.msclkid = params.get('msclkid');
                if (params.has('fbclid')) trackingParams.fbclid = params.get('fbclid');
                if (params.has('li_fat_id')) trackingParams.li_fat_id = params.get('li_fat_id');
                const clickId = consolidateClickIds(trackingParams);
                if (clickId) submissionData.click_id = clickId;
            }

            window.dataLayer.push({ 
                event: 'form_submit', 
                formId: form.id, 
                formData: formData, 
                formClass: form.className, 
                formShow: formShow 
            });
            
            // Get consent data
            const consentData = getConsentData();
            
            const returnData = Object.assign({}, data, { 
                event_type: "form_submit", 
                formId: form.id, 
                additional_data: Object.assign({}, formData, submissionData), 
                visitor_id: getVisitorId(),
                url: window.location.href,
                action_timestamp: new Date().toISOString() 
            });
            
            // Filter data based on consent before adding consent data
            const filteredData = filterTrackingDataByConsent(returnData);

            // Add consent data if available
            if (consentData) {
                Object.assign(filteredData, consentData);
            }
            
            // Normalize field names before sending
            const normalizedData = normalizeFieldNames(filteredData);

            // Send to the tracking endpoint with retry logic
            sendTrackingData(normalizedData)
                .then((result) => {
                    // Success - form submission data sent successfully
                    if (TRACKER_CONFIG.enableLogging) {
                        if (!logger) initializeLogger();
                        logger.info('Form submission data sent successfully', {
                            formId: form.id,
                            formClass: form.className,
                            visitorId: normalizedData.visitor_id,
                            status: result.status,
                            duration: result.duration,
                            attempt: result.attempt,
                            eventType: 'form_submit'
                        });
                    }
                })
                .catch((error) => {
                    logTrackingEvent('final_error', {
                        error: error.error.message,
                        attempts: error.attempts,
                        eventType: 'form_submit',
                        visitorId: normalizedData.visitor_id
                    });
                    if (TRACKER_CONFIG.enableLogging) {
                        if (!logger) initializeLogger();
                        logger.error('Form submission failed after all retries', error.error, {
                            formId: form.id,
                            formClass: form.className,
                            visitorId: normalizedData.visitor_id,
                            attempts: error.attempts,
                            eventType: 'form_submit'
                        });
                    }
                });
        }
    }

    // Ã¢Å“â€¦ getData check if have consent
    function getTrackingData() {
        var sessionData = JSON.parse(sessionStorage.getItem(TRACKER_CONFIG.sessionDataKey) || '{}');

        if (hasConsent('analytics')) {
            var localData = localStorage.getItem(TRACKER_CONFIG.sessionDataKey);
            if (localData) {
                // Merge sessionStorage data with localStorage data
                return Object.assign({}, JSON.parse(localData), { attribution: JSON.parse(localData) });
            }
        }

        // If no consent or localStorage is empty, return only sessionStorage data
        return Object.assign({}, sessionData, { attribution: sessionData });
    }

    function updateTrackingData(newData) {
        // Create a copy of the new data to avoid mutating the original object
        var sessionDataToSave = Object.assign({}, newData);
        
        // Properly handle params - ensure it's always an object
        var sessionParamsToSave = {};
        if (newData.params) {
            if (typeof newData.params === 'string') {
                try {
                    sessionParamsToSave = JSON.parse(newData.params);
                } catch (e) {
                    // If parsing fails, use empty object
                    sessionParamsToSave = {};
                }
            } else if (typeof newData.params === 'object') {
                sessionParamsToSave = Object.assign({}, newData.params);
            }
        }

        // Remove the 'fullURL' key from the session data
        if (sessionDataToSave.hasOwnProperty('fullURL')) {
            delete sessionDataToSave.fullURL;
        }

        if (sessionDataToSave.hasOwnProperty('params')) {
            delete sessionDataToSave.params;
        }

        if (sessionDataToSave.hasOwnProperty('attribution')) {
            delete sessionDataToSave.attribution;
        }

        // Retrieve existing session data
        var sessionData = JSON.parse(sessionStorage.getItem(TRACKER_CONFIG.sessionDataKey) || '{}');
        var sessionParams = JSON.parse(sessionStorage.getItem(TRACKER_CONFIG.tempParamsKey) || '{}');
        // Merge new data (without 'fullURL') with session data
        var updatedSessionData = Object.assign({}, sessionData, sessionDataToSave);
        var updatedSessionParams = Object.assign({}, sessionParams, sessionParamsToSave);
        sessionStorage.setItem(TRACKER_CONFIG.sessionDataKey, JSON.stringify(updatedSessionData));
        sessionStorage.setItem(TRACKER_CONFIG.tempParamsKey, JSON.stringify(updatedSessionParams));
        // If consent is granted, update localStorage with the full data (including 'fullURL')
        if (hasConsent('analytics')) {
            if (newData.hasOwnProperty('attribution')) {
                delete newData.attribution;
            }
            var localData = JSON.parse(localStorage.getItem(TRACKER_CONFIG.sessionDataKey) || '{}');
            
            // Only include params if it has actual data
            var localDataUpdate = Object.assign({}, localData, newData, { url: newData.fullURL });
            if (Object.keys(updatedSessionParams).length > 0) {
                localDataUpdate.params = updatedSessionParams;
            }
            
            localStorage.setItem(TRACKER_CONFIG.sessionDataKey, JSON.stringify(localDataUpdate));
        }
    }

    function getAllQueryParams() {
        var params = new URLSearchParams(window.location.search);
        var queryParams = {};
        var entries = params.entries(); // Get an iterator for the entries

        var entry;
        while (!(entry = entries.next()).done) {
            var key = entry.value[0];
            var value = entry.value[1];
            queryParams[key] = value;
        }

        return queryParams;
    }

    // Ã¢Å“â€¦ Debug function for GTM consent
    function debugGTMConsent() {
        console.group('Ã°Å¸â€Â GTM Consent Debug Information');

        // Determine which consent source is being used
        var consentSource = 'Unknown';
        var gtmAvailable = typeof gtag !== 'undefined' && gtag.consent;
        var oneTrustAvailable = !!getCookie('OptanonConsent');

        if (gtmAvailable) {
            consentSource = 'GTM Consent Mode';
        } else if (oneTrustAvailable) {
            consentSource = 'OneTrust Cookie';
        } else {
            consentSource = 'Default (No Consent)';
        }


        // Check if GTM is loaded
        console.log('GTM Loaded:', typeof gtag !== 'undefined');
        console.log('GTM Consent Available:', gtmAvailable);
        if (typeof gtag !== 'undefined' && gtag.consent) {
            console.log('GTM Consent Object:', gtag.consent);
        }
        // Debug GTM consent using correct method
        if (typeof gtag !== 'undefined' && gtag.consent) {
            try {
                console.log('GTM Consent State (gtag.consent.get()):', gtag.consent.get());
            } catch (e) {
                console.error('Error getting GTM consent:', e);
            }
        }
        // Check dataLayer
        console.log('DataLayer Available:', !!window.dataLayer);
        console.log('DataLayer Length:', window.dataLayer ? window.dataLayer.length : 0);

        // Debug GTM consent state
        if (typeof gtag !== 'undefined' && gtag.consent) {
            try {
                var consentState = gtag.consent.get();
                console.log('GTM Consent State:', consentState);

                if (consentState) {
                    console.log('Analytics Storage:', consentState.analytics_storage);
                    console.log('Ad Storage:', consentState.ad_storage);
                    console.log('Ad User Data:', consentState.ad_user_data);
                    console.log('Functionality Storage:', consentState.functionality_storage);
                    console.log('Personalization Storage:', consentState.personalization_storage);
                    console.log('Security Storage:', consentState.security_storage);
                }
            } catch (e) {
                console.error('Error reading GTM consent state:', e);
            }
        }

        // Debug dataLayer consent events
        if (window.dataLayer) {
            console.log('Recent DataLayer Events:');
            var recentEvents = window.dataLayer.slice(-10); // Last 10 events
            recentEvents.forEach(function (item, index) {
                if (item && (item.consent || item.event === 'consent' || item.event === 'consent_update')) {
                    console.log('Event ' + (window.dataLayer.length - 10 + index) + ':', item);
                }
            });
        }

        // Debug our stored consent
        var storedConsent = JSON.parse(localStorage.getItem('userConsent') || '{}');
        console.log('Our Stored Consent:', storedConsent);

        // Debug visitor ID
        var visitorId = localStorage.getItem(TRACKER_CONFIG.visitorIdKey) || sessionStorage.getItem(TRACKER_CONFIG.visitorIdKey);
        console.log('Visitor ID:', visitorId);
        console.log('Visitor ID Location:', localStorage.getItem(TRACKER_CONFIG.visitorIdKey) ? 'localStorage' : 'sessionStorage');

        // Check current consent status
        var currentConsent = checkConsentFromCookie();
        console.log('Current Consent Status:', currentConsent);

        // Show consent source in consent status
        if (currentConsent.source) {
            console.log('Ã°Å¸â€œÂ Consent Source Used:', currentConsent.source);
            console.log('Ã°Å¸â€œâ€¹ Consent Details:');
            console.log('   - Necessary:', currentConsent.necessary);
            console.log('   - Analytics:', currentConsent.analytics);
            console.log('   - Marketing:', currentConsent.marketing);
        }

        // Debug OneTrust consent specifically
        var oneTrustConsent = parseOneTrustConsent();
        if (oneTrustConsent) {
            console.log('OneTrust Consent Details:', oneTrustConsent);
        }

        // Debug consent mode version
        if (typeof gtag !== 'undefined' && gtag.consent) {
            try {
                var consentMode = gtag.consent.get();
                if (consentMode) {
                    console.log('Consent Mode Version:', consentMode.version || 'v1');
                }
            } catch (e) {
                console.log('Could not determine consent mode version:', e);
            }
        }

        console.groupEnd();

        return {
            gtmLoaded: typeof gtag !== 'undefined',
            gtmConsentAvailable: typeof gtag !== 'undefined' && gtag.consent,
            dataLayerAvailable: !!window.dataLayer,
            dataLayerLength: window.dataLayer ? window.dataLayer.length : 0,
            storedConsent: storedConsent,
            currentConsent: currentConsent,
            visitorId: visitorId
        };
    }

    // Ã¢Å“â€¦ Public debug function
    window.debugGTMConsent = debugGTMConsent;

    // Ã¢Å“â€¦ Auto-start GTM debug monitoring
    function startGTMDebug() {
        console.log('Starting GTM Debug Monitoring...');

        // Initial debug check
        debugGTMConsent();

        // Set up periodic monitoring
        var debugInterval = setInterval(function () {
            console.log('Ã¢ÂÂ° Periodic GTM Debug Check...');
            debugGTMConsent();
        }, 10000); // Check every 10 seconds

        // Store interval ID for potential stopping
        window.gtmDebugInterval = debugInterval;

        console.log('GTM Debug Monitoring Started - Checking every 10 seconds');
        console.log('Use stopGTMDebug() to stop monitoring');

        return debugInterval;
    }

    // Ã¢Å“â€¦ Stop GTM debug monitoring
    function stopGTMDebug() {
        if (window.gtmDebugInterval) {
            clearInterval(window.gtmDebugInterval);
            window.gtmDebugInterval = null;
            console.log('GTM Debug Monitoring Stopped');
        } else {
            console.log('Ã¢â€žÂ¹Ã¯Â¸Â No active GTM debug monitoring to stop');
        }
    }

    // Ã¢Å“â€¦ Public debug control functions
    window.startGTMDebug = startGTMDebug;
    window.stopGTMDebug = stopGTMDebug;

    // Ã¢Å“â€¦ Auto-start debug if in development/preview mode
    if (!window.DISABLE_GTM_DEBUG) {
        console.log('Development/Preview mode detected - Auto-starting GTM debug...');
        setTimeout(function() {
            startGTMDebug();
            // Also run comprehensive diagnostic
            setTimeout(diagnoseGTMConsentMode, 1000);
        }, 2000); // Start after 2 seconds to ensure GTM is loaded
    }

    // Ã¢Å“â€¦ Parse OneTrust consent cookie
    function parseOneTrustConsent() {

        var optanonConsent = getCookie('OptanonConsent');
        if (!optanonConsent) {
            return null;
        }

        // Parse the consent string
        var consentParams = new URLSearchParams(optanonConsent);
        var groups = consentParams.get('groups');


        if (!groups) {
            return null;
        }

        // Parse groups (format: C0001:1,C0004:1,C0005:1,BG14:1,C0003:0,C0002:0,BG15:0)
        var groupConsents = {};
        var groupArray = groups.split(',');


        for (var i = 0; i < groupArray.length; i++) {
            var group = groupArray[i];
            var parts = group.split(':');
            if (parts.length === 2) {
                var groupId = parts[0];
                var consent = parts[1] === '1';
                groupConsents[groupId] = consent;
            } else {
                console.log('   Ã¢Å¡ Ã¯Â¸Â Invalid group format:', group);
            }
        }


        // Map OneTrust categories to our categories
        var analyticsConsent = groupConsents['C0003'] || groupConsents['C0002'] || false; // Performance/Analytics
        var marketingConsent = groupConsents['C0004'] || groupConsents['C0005'] || false; // Marketing/Targeting
        var necessaryConsent = groupConsents['C0001'] || true; // Necessary (default to true)


        var result = {
            necessary: necessaryConsent,
            analytics: analyticsConsent,
            marketing: marketingConsent,
            rawGroups: groupConsents,
            rawCookie: optanonConsent
        };

        return result;
    }

    // Ã¢Å“â€¦ Get cookie value by name
    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function checkConsentFromCookie() {
        // Set re-entrancy guard to prevent recursion during consent sync
        _consentSyncInProgress = true;
        
        try {
            return _checkConsentFromCookieInternal();
        } finally {
            _consentSyncInProgress = false;
        }
    }
    
    // Internal implementation - separated to allow try/finally guard pattern
    function _checkConsentFromCookieInternal() {
        if (!logger) initializeLogger();
        logger.debug('Starting consent mode debug check');
        
        // 1Ã¯Â¸ÂÃ¢Æ’Â£ Check GTM availability first
        logger.debug('Checking GTM availability');
        var gtmAvailable = typeof gtag !== 'undefined';
        var gtmConsentAvailable = gtmAvailable && !!gtag.consent;
        
        logger.debug('GTM availability status', {
            gtmAvailable: gtmAvailable,
            gtmConsentAvailable: gtmConsentAvailable
        });
        
        if (gtmAvailable) {
            // If GTM is available, check gtag.consent.get() first
            if (gtmConsentAvailable) {
                var gtmConsentGetAvailable = typeof gtag.consent.get === 'function';
                logger.debug('GTM consent API status', {
                    consentGetAvailable: gtmConsentGetAvailable
                });
                
                if (gtmConsentGetAvailable) {
                    try {
                        logger.debug('Attempting to get GTM consent state');
                        var consentState = gtag.consent.get();
                        logger.debug('GTM consent state retrieved', consentState);
                        
                        if (consentState) {
                            logger.debug('GTM consent state properties', Object.keys(consentState));
                            
                            // Map GTM consent categories to our categories
                            var analyticsConsent = consentState.analytics_storage === 'granted';
                            var marketingConsent = consentState.ad_storage === 'granted' || consentState.ad_user_data === 'granted';

                            logger.debug('Mapped GTM consent values', {
                                analytics: analyticsConsent,
                                marketing: marketingConsent,
                                rawAnalytics: consentState.analytics_storage,
                                rawAdStorage: consentState.ad_storage,
                                rawAdUserData: consentState.ad_user_data
                            });

                            setConsentCategory('analytics', analyticsConsent);
                            setConsentCategory('marketing', marketingConsent);

                            logger.info('GTM Consent Mode working - using GTM source', {
                                source: 'GTM',
                                analytics: analyticsConsent,
                                marketing: marketingConsent
                            });
                            
                            return {
                                necessary: true, // Necessary cookies are always granted
                                analytics: analyticsConsent,
                                marketing: marketingConsent,
                                source: 'GTM',
                                consentState: consentState
                            };
                        } else {
                            logger.warn('GTM consent state is null/undefined');
                        }
                    } catch (e) {
                        logger.error('Error reading GTM consent state', e, {
                            gtmAvailable: gtmAvailable,
                            gtmConsentAvailable: gtmConsentAvailable
                        });
                    }
                } else {
                    logger.warn('gtag.consent.get is not a function');
                }
            } else {
                logger.warn('gtag.consent is not available - GTM Consent Mode may not be properly configured');
            }
            
            // Only check localStorage for GTM consent if GTM is available (as fallback)
            logger.debug('Checking localStorage for GTM consent data (fallback)');
            var gtmConsentKey = 'gtm_consent_state';
            var localStorageConsent = localStorage.getItem(gtmConsentKey);
            
            if (localStorageConsent) {
                try {
                    var parsedConsent = JSON.parse(localStorageConsent);
                    logger.debug('Found localStorage consent data', parsedConsent);
                    
                    // Check if the data has the expected format
                    if (parsedConsent.analytics_storage !== undefined || parsedConsent.ad_storage !== undefined) {
                        logger.debug('Valid GTM consent format detected');
                        
                        // Map localStorage consent to our categories
                        var analyticsConsent = parsedConsent.analytics_storage === true;
                        var marketingConsent = parsedConsent.ad_storage === true;
                        var timestamp = parsedConsent.timestamp || null;
                        
                        logger.debug('Mapped consent values', {
                            analytics: analyticsConsent,
                            marketing: marketingConsent,
                            timestamp: timestamp
                        });

                        setConsentCategory('analytics', analyticsConsent);
                        setConsentCategory('marketing', marketingConsent);

                        logger.info('localStorage GTM consent found - using localStorage source', {
                            source: 'localStorage',
                            analytics: analyticsConsent,
                            marketing: marketingConsent,
                            timestamp: timestamp
                        });
                        
                        return {
                            necessary: true, // Necessary cookies are always granted
                            analytics: analyticsConsent,
                            marketing: marketingConsent,
                            source: 'localStorage',
                            consentState: parsedConsent,
                            timestamp: timestamp
                        };
                    } else {
                        logger.warn('localStorage data does not match expected GTM consent format', parsedConsent);
                    }
                } catch (e) {
                    logger.error('Error parsing localStorage consent data', e, { rawData: localStorageConsent });
                }
            } else {
                logger.debug('No GTM consent data found in localStorage');
            }
        } else {
            logger.warn('gtag is not available - GTM is not loaded, skipping GTM consent check');
        }

        // 3Ã¯Â¸ÂÃ¢Æ’Â£ Enhanced dataLayer fallback check
        logger.debug('Checking dataLayer fallback');
        var dataLayerAvailable = !!window.dataLayer;
        logger.debug('DataLayer availability', {
            dataLayerAvailable: dataLayerAvailable,
            dataLayerLength: dataLayerAvailable ? window.dataLayer.length : 0
        });
        
        if (dataLayerAvailable) {
            // Look for consent events in dataLayer
            var consentEvents = [];
            for (var i = window.dataLayer.length - 1; i >= 0; i--) {
                var item = window.dataLayer[i];
                if (item && (item.consent || item.event === 'consent' || item.event === 'consent_update')) {
                    consentEvents.push({ index: i, item: item });
                }
            }
            
            logger.debug('Found consent events in dataLayer', {
                eventCount: consentEvents.length,
                events: consentEvents
            });
            
            // Check for consent.default in dataLayer
            for (var i = window.dataLayer.length - 1; i >= 0; i--) {
                var item = window.dataLayer[i];
                if (item && item.consent && item.consent.default) {
                    logger.debug('Found consent.default in dataLayer', {
                        index: i,
                        consentData: item.consent.default
                    });
                    
                    var analyticsConsent = item.consent.default.analytics_storage === 'granted';
                    var marketingConsent = item.consent.default.ad_storage === 'granted' || item.consent.default.ad_user_data === 'granted';

                    logger.debug('Mapped dataLayer consent values', {
                        analytics: analyticsConsent,
                        marketing: marketingConsent
                    });

                    setConsentCategory('analytics', analyticsConsent);
                    setConsentCategory('marketing', marketingConsent);

                    logger.info('DataLayer consent found - using DataLayer source', {
                        source: 'DataLayer',
                        analytics: analyticsConsent,
                        marketing: marketingConsent
                    });
                    
                    return {
                        necessary: true,
                        analytics: analyticsConsent,
                        marketing: marketingConsent,
                        source: 'DataLayer',
                        consentData: item.consent.default
                    };
                }
            }
            
            logger.warn('No valid consent data found in dataLayer');
        } else {
            logger.warn('dataLayer is not available');
        }

        // 4Ã¯Â¸ÂÃ¢Æ’Â£ Enhanced OneTrust fallback check
        logger.debug('Checking OneTrust fallback');
        var oneTrustConsent = parseOneTrustConsent();
        if (oneTrustConsent) {
            logger.info('OneTrust consent found', oneTrustConsent);
            setConsentCategory('analytics', oneTrustConsent.analytics);
            setConsentCategory('marketing', oneTrustConsent.marketing);

            return {
                necessary: oneTrustConsent.necessary,
                analytics: oneTrustConsent.analytics,
                marketing: oneTrustConsent.marketing,
                source: 'OneTrust',
                rawGroups: oneTrustConsent.rawGroups
            };
        } else {
            logger.debug('OneTrust consent not found');
        }

        // 5Ã¯Â¸ÂÃ¢Æ’Â£ Default fallback - No consent managers available
        // Return false by default - this will trigger the fallback consent manager window to show
        logger.warn('No consent managers available - returning default (no consent granted)');
        logger.info('Fallback consent manager will be initialized to collect user consent');
        setConsentCategory('analytics', false);
        setConsentCategory('marketing', false);
        
        logger.warn('No consent mode available - using default (will show consent window)', {
            source: 'Default',
            analytics: false,
            marketing: false
        });
        
        return {
            necessary: true,
            analytics: false,
            marketing: false,
            source: 'Default'
        };
    }

    // Ã¢Å“â€¦ Detect which consent manager is being used (external managers only)
    function detectConsentManager() {
        // Check GTM Consent Mode
        if (typeof gtag !== 'undefined' && gtag.consent && typeof gtag.consent.get === 'function') {
            try {
                const consentState = gtag.consent.get();
                if (consentState) {
                    return 'GTM';
                }
            } catch (e) {
                // GTM exists but consent.get() failed
            }
        }

        // Check localStorage for GTM consent data (only if GTM is available)
        if (typeof gtag !== 'undefined') {
            var gtmConsentKey = 'gtm_consent_state';
            var localStorageConsent = localStorage.getItem(gtmConsentKey);
            if (localStorageConsent) {
                try {
                    var parsedConsent = JSON.parse(localStorageConsent);
                    if (parsedConsent.analytics_storage !== undefined || parsedConsent.ad_storage !== undefined) {
                        return 'localStorage';
                    }
                } catch (e) {
                    // Failed to parse
                }
            }
        }

        // Check dataLayer for consent events
        if (window.dataLayer) {
            for (var i = window.dataLayer.length - 1; i >= 0; i--) {
                var item = window.dataLayer[i];
                if (item && item.consent && item.consent.default) {
                    return 'DataLayer';
                }
            }
        }

        // Check OneTrust cookie
        if (getCookie('OptanonConsent')) {
            return 'OneTrust';
        }

        // No external consent manager detected
        // Note: Fallback consent manager check is done separately in initFallbackConsentManager()
        return null;
    }

    // Ã¢Å“â€¦ Get structured consent data for tracking
    function getConsentData() {
        if (!TRACKER_CONFIG.enableConsentTracking) {
            return null;
        }

        var consentInfo = checkConsentFromCookie();
        var storedConsent = JSON.parse(localStorage.getItem('userConsent') || '{}');
        
        // Get timestamp from stored consent or use current time
        var consentTimestamp = storedConsent.timestamp || consentInfo.timestamp || new Date().toISOString();
        
        // Determine source
        var detectedSource = detectConsentManager();
        var consentSource = consentInfo.source || detectedSource || 'Default';

        return {
            consent_source: consentSource,
            consent_analytics: consentInfo.analytics === true ? 1 : 0,
            consent_marketing: consentInfo.marketing === true ? 1 : 0,
            consent_necessary: consentInfo.necessary === true ? 1 : 1, // Always true
            consent_timestamp: consentTimestamp
        };
    }

    // Ã¢Å“â€¦ Initialize fallback consent manager
    function initFallbackConsentManager() {
        if (!TRACKER_CONFIG.enableFallbackConsentManager) {
            return;
        }

        // Check if consent was already given via fallback (check this first)
        var storedConsent = JSON.parse(localStorage.getItem('userConsent') || '{}');
        if (storedConsent.fallbackConsentGiven === true) {
            return; // Already shown and user responded
        }

        // Check if consent manager already exists (excluding fallback and localStorage from fallback)
        var existingManager = detectConsentManager();
        
        // If localStorage is detected, check if it's actually from an external manager
        if (existingManager === 'localStorage') {
            // Check if this localStorage data is from fallback (shouldn't happen, but double-check)
            if (storedConsent.source === 'fallback') {
                // This is from fallback, allow initialization to proceed
                existingManager = 'fallback';
            } else {
                // Check if there's GTM consent data (which would indicate external manager)
                var gtmConsentKey = 'gtm_consent_state';
                var gtmConsent = localStorage.getItem(gtmConsentKey);
                if (gtmConsent) {
                    // GTM consent exists, skip fallback
                    if (!logger) initializeLogger();
                    logger.debug('GTM consent manager detected, skipping fallback', {
                        detectedManager: 'GTM (localStorage)'
                    });
                    return;
                }
                // No GTM consent, but localStorage has consent data without fallbackConsentGiven
                // This might be old/legacy data, allow fallback to show
                existingManager = null;
            }
        }
        
        if (existingManager && existingManager !== 'fallback' && existingManager !== 'Default' && existingManager !== null) {
            if (!logger) initializeLogger();
            logger.debug('Consent manager detected, skipping fallback', {
                detectedManager: existingManager
            });
            return;
        }

        // Create minimal consent banner
        var banner = document.createElement('div');
        banner.id = 'tracker360-consent-banner';
        banner.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; background: #333; color: #fff; padding: 15px 20px; z-index: 10000; box-shadow: 0 -2px 10px rgba(0,0,0,0.2); font-family: Arial, sans-serif; font-size: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;';
        
        var messageDiv = document.createElement('div');
        messageDiv.style.cssText = 'flex: 1; margin-right: 20px; margin-bottom: 10px;';
        messageDiv.textContent = 'We use cookies to enhance your experience. Do you accept cookies?';
        
        var buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 10px;';
        
        var acceptButton = document.createElement('button');
        acceptButton.textContent = 'Accept';
        acceptButton.style.cssText = 'background: #4CAF50; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; font-size: 14px; font-weight: bold;';
        acceptButton.onclick = function() {
            setConsentCategory('analytics', true);
            setConsentCategory('marketing', true);
            
            // Mark consent as given via fallback
            var consent = JSON.parse(localStorage.getItem('userConsent') || '{}');
            consent.fallbackConsentGiven = true;
            consent.source = 'fallback';
            consent.timestamp = new Date().toISOString();
            localStorage.setItem('userConsent', JSON.stringify(consent));
            
            banner.remove();
            
            if (!logger) initializeLogger();
            logger.info('Consent accepted via fallback manager', {
                analytics: true,
                marketing: true
            });
        };
        
        var rejectButton = document.createElement('button');
        rejectButton.textContent = 'Reject';
        rejectButton.style.cssText = 'background: #f44336; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; font-size: 14px; font-weight: bold;';
        rejectButton.onclick = function() {
            setConsentCategory('analytics', false);
            setConsentCategory('marketing', false);
            
            // Mark consent as given via fallback
            var consent = JSON.parse(localStorage.getItem('userConsent') || '{}');
            consent.fallbackConsentGiven = true;
            consent.source = 'fallback';
            consent.timestamp = new Date().toISOString();
            localStorage.setItem('userConsent', JSON.stringify(consent));
            
            banner.remove();
            
            if (!logger) initializeLogger();
            logger.info('Consent rejected via fallback manager', {
                analytics: false,
                marketing: false
            });
        };
        
        buttonContainer.appendChild(acceptButton);
        buttonContainer.appendChild(rejectButton);
        banner.appendChild(messageDiv);
        banner.appendChild(buttonContainer);
        
        // Wait for DOM to be ready
        if (document.body) {
            document.body.appendChild(banner);
        } else {
            document.addEventListener('DOMContentLoaded', function() {
                document.body.appendChild(banner);
            });
        }
        
        if (!logger) initializeLogger();
        logger.info('Fallback consent manager initialized and displayed');
    }

    // Ã¢Å“â€¦ Add console warning for missing consent manager
    function checkConsentManagerWarning() {
        if (!TRACKER_CONFIG.enableConsentTracking) {
            return;
        }

        var detectedManager = detectConsentManager();
        
        if (!detectedManager || detectedManager === 'Default') {
            console.warn('%cÃ¢Å¡ Ã¯Â¸Â Tracker 360: No Consent Manager Detected', 'color: #ff9800; font-weight: bold; font-size: 14px;');
            console.warn('Consent tracking is enabled but no consent manager was detected.');
            console.warn('To enable the fallback consent manager, set:');
            console.warn('window.TRACKER_360_CONFIG.enableFallbackConsentManager = true');
            console.warn('Or integrate a consent management solution (GTM Consent Mode, OneTrust, etc.)');
            
            if (!logger) initializeLogger();
            logger.warn('No consent manager detected - consent tracking may be incomplete', {
                enableFallbackConsentManager: TRACKER_CONFIG.enableFallbackConsentManager
            });
        } else {
            if (!logger) initializeLogger();
            logger.debug('Consent manager detected', {
                manager: detectedManager
            });
        }
    }

    // Ã¢Å“â€¦ Monitor consent changes - Requirement 5.4
    // Track last checked consent to prevent unnecessary processing
    var lastCheckedConsent = {
        analytics: null,
        marketing: null
    };
    var consentMonitoringInterval = null;

    function monitorConsentChanges() {
        // Prevent multiple intervals from being created
        if (consentMonitoringInterval !== null) {
            if (!logger) initializeLogger();
            logger.debug('Consent monitoring already active, skipping initialization');
            return;
        }

        var lastConsentCheck = JSON.parse(localStorage.getItem('userConsent') || '{}');
        lastCheckedConsent.analytics = lastConsentCheck.analytics;
        lastCheckedConsent.marketing = lastConsentCheck.marketing;
        
        consentMonitoringInterval = setInterval(function() {
            var currentConsent = checkConsentFromCookie();
            var storedConsent = JSON.parse(localStorage.getItem('userConsent') || '{}');
            
            // Ã¢Å“â€¦ Guard: Only process if consent has actually changed
            var analyticsChanged = currentConsent.analytics !== storedConsent.analytics && 
                                   currentConsent.analytics !== lastCheckedConsent.analytics;
            var marketingChanged = currentConsent.marketing !== storedConsent.marketing && 
                                   currentConsent.marketing !== lastCheckedConsent.marketing;
            
            if (analyticsChanged) {
                lastCheckedConsent.analytics = currentConsent.analytics;
                setConsentCategory('analytics', currentConsent.analytics);
            }
            
            if (marketingChanged) {
                lastCheckedConsent.marketing = currentConsent.marketing;
                setConsentCategory('marketing', currentConsent.marketing);
            }
        }, 1000); // Check every second for consent changes
    }

    // Ã¢Å“â€¦ Send scroll depth event
    function sendScrollDepthEvent() {
        if (!hasConsent('analytics')) {
            return; // Only send if analytics consent is given
        }

        const scrollDepth = getScrollDepth();
        const data = getTrackingData();
        
        // Get consent data
        const consentData = getConsentData();

        const trackingData = Object.assign({}, data, {
            event_type: 'scroll_depth',
            scroll_depth: scrollDepth,
            visitor_id: getVisitorId(),
            url: window.location.href,
            action_timestamp: new Date().toISOString(),
            sessionDuration: getSessionDuration(),
            pageLoadTime: getPageLoadTime()
        });

        // Filter data based on consent before adding consent data
        const filteredData = filterTrackingDataByConsent(trackingData);

        // Add consent data if available
        if (consentData) {
            Object.assign(filteredData, consentData);
        }

        // Normalize field names before sending
        const normalizedData = normalizeFieldNames(filteredData);

        // Send to the tracking endpoint with retry logic
        sendTrackingData(normalizedData)
            .then((result) => {
                // Success - scroll depth event sent successfully
            })
            .catch((error) => {
                logTrackingEvent('final_error', {
                    error: error.error.message,
                    attempts: error.attempts,
                    eventType: 'scroll_depth',
                    visitorId: normalizedData.visitor_id
                });
            });
    }

    // Ã¢Å“â€¦ Enhanced event tracking with consent awareness - Tracks every click
    function trackGenericClickWithConsent(event) {
        // Send scroll depth event before click event
        sendScrollDepthEvent();

        // Always track essential click data - track every click on the page
        const data = getTrackingData();
        const target = event.target;
        const params = new URLSearchParams(window.location.search);

        const clickData = {
            tagName: target.tagName,
            id: target.id || null,
            classList: target.className || null,
            textContent: target.textContent.trim().substring(0, 100),
            href: target.closest('a') ? target.closest('a').href : null,
        };

        // Ã¢Å“â€¦ Include full analytics data if consent is given
        if (hasConsent('analytics')) {
            const analyticsData = getStoredAnalyticsData();
            if (Object.keys(analyticsData).length > 0) {
                Object.assign(clickData, analyticsData);
            }
            // Also add real-time analytics data
            clickData.scrollDepth = getScrollDepth();
            clickData.pageLoadTime = getPageLoadTime();
            clickData.sessionDuration = getSessionDuration();
        }

        // Ã¢Å“â€¦ Include full marketing data if consent is given
        if (hasConsent('marketing')) {
            const marketingData = getStoredMarketingData();
            if (Object.keys(marketingData).length > 0) {
                Object.assign(clickData, marketingData);
            }
            // Also add real-time marketing data from URL params
            clickData.url = window.location.href;
            if (params.has('utm_source')) clickData.utm_source = params.get('utm_source');
            // Consolidate click IDs
            const trackingParams = {};
            if (params.has('gclid')) trackingParams.gclid = params.get('gclid');
            if (params.has('dclid')) trackingParams.dclid = params.get('dclid');
            if (params.has('msclkid')) trackingParams.msclkid = params.get('msclkid');
            if (params.has('fbclid')) trackingParams.fbclid = params.get('fbclid');
            if (params.has('li_fat_id')) trackingParams.li_fat_id = params.get('li_fat_id');
            const clickId = consolidateClickIds(trackingParams);
            if (clickId) clickData.click_id = clickId;
        }

        if (target.id === 'daextlwcnf-cookie-notice-button-2') {
            location.reload();
        }

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'generic_click', data: clickData });
        
        // Get consent data
        const consentData = getConsentData();
        
        // Ã¢Å“â€¦ Include marketing/analytics data in tracking data
        let trackingData = Object.assign({}, data, { 
            event_type: "generic_click", 
            clickData: clickData, 
            visitor_id: getVisitorId(),
            url: window.location.href,
            action_timestamp: new Date().toISOString() 
        });

        // Ã¢Å“â€¦ Merge stored marketing/analytics data into tracking data
        if (hasConsent('marketing')) {
            const marketingData = getStoredMarketingData();
            if (Object.keys(marketingData).length > 0) {
                trackingData = Object.assign({}, trackingData, marketingData);
            }
        }
        if (hasConsent('analytics')) {
            const analyticsData = getStoredAnalyticsData();
            if (Object.keys(analyticsData).length > 0) {
                trackingData = Object.assign({}, trackingData, analyticsData);
            }
        }
        
        // Filter data based on consent before adding consent data
        const filteredData = filterTrackingDataByConsent(trackingData);

        // Add consent data if available
        if (consentData) {
            Object.assign(filteredData, consentData);
        }
        
        // Normalize field names before sending
        const normalizedData = normalizeFieldNames(filteredData);
        
        sendTrackingData(normalizedData)
            .then((result) => {
                // Success - data sent successfully (including marketing/analytics if consent granted)
            })
            .catch((error) => {
                logTrackingEvent('final_error', {
                    error: error.error.message,
                    attempts: error.attempts,
                    eventType: 'generic_click',
                    visitorId: normalizedData.visitor_id
                });
            });
    }
    // Ã¢Å“â€¦ Track Booking/Form Submission Clicks (Dynamic Configuration)
    function trackBookingClick(event) {
        if (!TRACKER_CONFIG.formSubmissionConfig.enabled) {
            return;
        }
        if (!logger) initializeLogger();
            logger.debug('formSubmissionConfig',TRACKER_CONFIG.formSubmissionConfig);
        const target = event.target;
        const config = TRACKER_CONFIG.formSubmissionConfig;
        
        // Check if element matches configured selectors
        const matchesSelector = config.buttonSelectors.some(function(selector) {
            if (selector.startsWith('input[')) {
                // Handle input type selectors like 'input[type="submit"]'
                const typeMatch = selector.match(/type="([^"]+)"/);
                if (typeMatch && target.tagName.toLowerCase() === 'input' && target.type.toLowerCase() === typeMatch[1].toLowerCase()) {
                    return true;
                }
            } else {
                // Handle tag name selectors
                if (target.tagName.toLowerCase() === selector.toLowerCase()) {
                    return true;
                }
                // Handle CSS selector matching
                try {
                    if (target.matches && target.matches(selector)) {
                        return true;
                    }
                } catch (e) {
                    // Selector not supported, skip
                }
            }
            return false;
        });

        if (!matchesSelector) {
            return;
        }

        // Log booking click detection
        if (TRACKER_CONFIG.enableLogging) {
            if (!logger) initializeLogger();
            logger.info('Booking click detected', {
                tagName: target.tagName,
                elementId: target.id,
                elementClass: target.className,
                textContent: (target.innerText || target.textContent || '').substring(0, 50),
                visitorId: getVisitorId(),
                url: window.location.href,
                eventType: 'booking_click'
            });
        }

        // Get text content (handles nested elements)
        const textContent = (target.innerText || target.textContent || '').toLowerCase().trim();
        
        // Check if text matches any configured pattern
        const matchesPattern = config.textPatterns.some(function(pattern) {
            return textContent.includes(pattern.toLowerCase());
        });

        // Also check data attributes
        const hasTrackingAttribute = config.dataAttributes.some(function(attr) {
            return target.hasAttribute(attr) || target.closest('[' + attr + ']') !== null;
        });

        // Check for tracking classes
        const hasTrackingClass = config.trackingClasses.some(function(className) {
            return target.classList.contains(className) || target.closest('.' + className) !== null;
        });

        // Log matching details
        if (TRACKER_CONFIG.enableLogging && (matchesPattern || hasTrackingAttribute || hasTrackingClass)) {
            if (!logger) initializeLogger();
            logger.debug('Booking click matches found', {
                tagName: target.tagName,
                elementId: target.id,
                matchesPattern: matchesPattern,
                hasTrackingAttribute: hasTrackingAttribute,
                hasTrackingClass: hasTrackingClass,
                matchedPattern: matchesPattern ? config.textPatterns.find(p => textContent.includes(p.toLowerCase())) : null,
                matchedAttribute: hasTrackingAttribute ? config.dataAttributes.find(attr => target.hasAttribute(attr) || target.closest('[' + attr + ']') !== null) : null,
                matchedClass: hasTrackingClass ? config.trackingClasses.find(cn => target.classList.contains(cn) || target.closest('.' + cn) !== null) : null,
                visitorId: getVisitorId(),
                eventType: 'booking_click'
            });
        }

        // Trigger form submission tracking if any condition matches
        if (matchesPattern || hasTrackingAttribute || hasTrackingClass) {
            if (TRACKER_CONFIG.enableLogging) {
                if (!logger) initializeLogger();
                logger.info('Booking click triggering form submission', {
                    tagName: target.tagName,
                    elementId: target.id,
                    visitorId: getVisitorId(),
                    eventType: 'booking_click'
                });
            }
            trackFormSubmission(event);
        }
    }

    // ✅ Track ShopCartRightBlock - Shopping Cart Summary Form
    function getCartSummaryData() {
        var cartData = {};
        
        try {
            // Get subtotal
            var subTotalEl = document.getElementById('subTotalValue');
            if (subTotalEl) {
                cartData.subtotal = subTotalEl.textContent.trim();
            }
            
            // Get shipping/delivery info
            var shippingEl = document.getElementById('shippingFeesValue');
            if (shippingEl) {
                cartData.shipping = shippingEl.textContent.trim();
            }
            
            // Get VAT
            var vatEl = document.getElementById('totalTaxValue');
            if (vatEl && vatEl.tagName === 'TD') {
                cartData.vat = vatEl.textContent.trim();
            }
            
            // Get total excl. VAT
            var totalExclVatEl = document.getElementById('totalValue');
            if (totalExclVatEl) {
                cartData.totalExclVat = totalExclVatEl.textContent.trim();
            }
            
            // Get total incl. VAT
            var totalInclVatEl = document.getElementById('totalPriceValue');
            if (totalInclVatEl) {
                cartData.totalInclVat = totalInclVatEl.textContent.trim();
            }
            
            // Get promo code if entered
            var promoCodeEl = document.getElementById('promoCode');
            if (promoCodeEl && promoCodeEl.value) {
                cartData.promoCode = promoCodeEl.value;
            }
            
            // Get order ID from hidden field
            var orderIdEl = document.querySelector('input[name="orderId"]');
            if (orderIdEl) {
                cartData.orderId = orderIdEl.value;
            }
        } catch (e) {
            if (TRACKER_CONFIG.enableLogging) {
                if (!logger) initializeLogger();
                logger.error('Error collecting cart summary data', e);
            }
        }
        
        return cartData;
    }

    function trackShopCartRightBlock(event) {
        var target = event.target;
        var shopCartBlock = document.getElementById('ShopCartRightBlock');
        
        // Only track if click is within ShopCartRightBlock
        if (!shopCartBlock || !shopCartBlock.contains(target)) {
            return;
        }
        
        var data = getTrackingData();
        var params = new URLSearchParams(window.location.search);
        var cartData = getCartSummaryData();
        var eventName = null;
        var buttonText = null;
        
        // Check for Order button click
        var orderButton = target.closest('#shopcartCheckout') || 
                          (target.id === 'shopcartCheckout') ||
                          target.closest('.js-shopCartCheckoutBtn');
        
        // Check for Quote request click
        var quoteButton = target.closest('#quotationCheckout') || 
                          (target.id === 'quotationCheckout') ||
                          target.closest('.js-quotationCheckoutBtn');
        
        // Check for Apply voucher button click
        var applyVoucherButton = target.closest('button[onclick*="ApplyPromotionCode"]') ||
                                  target.closest('.bt-2');
        if (applyVoucherButton && shopCartBlock.querySelector('#PromotionCodeForm')?.contains(applyVoucherButton)) {
            eventName = 'form_submit';
            buttonText = 'Apply Voucher';
        }
        
        if (orderButton) {
            eventName = 'form_submit';
            buttonText = 'Order';
        } else if (quoteButton) {
            eventName = 'form_submit';
            buttonText = 'Request a quote';
        }
        
        // Only proceed if a tracked button was clicked
        if (!eventName) {
            return;
        }
        
        if (TRACKER_CONFIG.enableLogging) {
            if (!logger) initializeLogger();
            logger.info('ShopCartRightBlock interaction detected', {
                eventName: eventName,
                buttonText: buttonText,
                cartData: cartData,
                visitorId: getVisitorId(),
                eventType: eventName
            });
        }
        
        var submissionData = {
            formId: 'ShopCartRightBlock',
            formClass: 'form-fieldset',
            action_timestamp: new Date().toISOString(),
            visitor_id: getVisitorId(),
            firstLandingURL: getFirstLandingURL(),
            buttonClicked: buttonText,
            cartSummary: cartData
        };
        
        // Add analytics data if consent is given
        if (hasConsent('analytics')) {
            submissionData.scrollDepth = getScrollDepth();
            submissionData.sessionDuration = getSessionDuration();
            submissionData.pageLoadTime = getPageLoadTime();
        }
        
        // Add marketing data if consent is given
        if (hasConsent('marketing')) {
            submissionData.url = window.location.href;
            if (params.has('utm_source')) submissionData.utm_source = params.get('utm_source');
            var trackingParams = {};
            if (params.has('gclid')) trackingParams.gclid = params.get('gclid');
            if (params.has('dclid')) trackingParams.dclid = params.get('dclid');
            if (params.has('msclkid')) trackingParams.msclkid = params.get('msclkid');
            if (params.has('fbclid')) trackingParams.fbclid = params.get('fbclid');
            if (params.has('li_fat_id')) trackingParams.li_fat_id = params.get('li_fat_id');
            var clickId = consolidateClickIds(trackingParams);
            if (clickId) submissionData.click_id = clickId;
        }
        
        // Push to dataLayer
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: eventName,
            formId: 'ShopCartRightBlock',
            buttonClicked: buttonText,
            cartSummary: cartData
        });
        
        // Get consent data
        var consentData = getConsentData();
        
        var returnData = Object.assign({}, data, {
            event_type: eventName,
            formId: 'ShopCartRightBlock',
            additional_data: submissionData,
            visitor_id: getVisitorId(),
            url: window.location.href,
            action_timestamp: new Date().toISOString()
        });
        
        // Filter data based on consent before adding consent data
        var filteredData = filterTrackingDataByConsent(returnData);
        
        // Add consent data if available
        if (consentData) {
            Object.assign(filteredData, consentData);
        }
        
        // Normalize field names before sending
        var normalizedData = normalizeFieldNames(filteredData);
        
        // Send to the tracking endpoint with retry logic
        sendTrackingData(normalizedData)
            .then(function(result) {
                if (TRACKER_CONFIG.enableLogging) {
                    if (!logger) initializeLogger();
                    logger.info('ShopCartRightBlock tracking data sent successfully', {
                        eventName: eventName,
                        visitorId: normalizedData.visitor_id,
                        status: result.status,
                        duration: result.duration,
                        eventType: eventName
                    });
                }
            })
            .catch(function(error) {
                logTrackingEvent('final_error', {
                    error: error.error.message,
                    attempts: error.attempts,
                    eventType: eventName,
                    visitorId: normalizedData.visitor_id
                });
                if (TRACKER_CONFIG.enableLogging) {
                    if (!logger) initializeLogger();
                    logger.error('ShopCartRightBlock tracking failed after all retries', error.error, {
                        eventName: eventName,
                        visitorId: normalizedData.visitor_id,
                        attempts: error.attempts,
                        eventType: eventName
                    });
                }
            });
    }

    // ✅ Run Tracking Based on Consent Categories - Enhanced for all requirements

    function initTracking() {
        // Sync consent from external sources (GTM, OneTrust, etc.) ONCE at init time
        // This prevents the recursion trap where hasConsent() used to call checkConsentFromCookie()
        // which called setConsentCategory() which called getVisitorId() which called hasConsent()
        checkConsentFromCookie();
        
        // Always initialize essential tracking - Requirement 5.1
        initEssentialTracking();

        // Always initialize analytics and marketing tracking to collect and store data
        // Data will be sent when consent is granted
        initAnalyticsTracking();
        initMarketingTracking();

        // Start monitoring for consent changes - Requirement 5.4
        monitorConsentChanges();

        // Initialize ref tracking for external links
        initRefTracking();

        // Check for consent manager and show warning if needed
        checkConsentManagerWarning();

        // Initialize fallback consent manager if no consent manager is detected
        initFallbackConsentManager();

        // Set up event listeners with consent awareness
        document.addEventListener('click', trackPhoneClick);
        document.addEventListener('click', trackBookingClick);
        document.addEventListener('click', trackGenericClickWithConsent);
        document.addEventListener('click', trackShopCartRightBlock);
        document.addEventListener('submit', trackFormSubmission);

        logTrackingEvent('info', {
            message: 'Tracking initialized - all data collected and stored, sent when consent granted',
            analyticsConsent: hasConsent('analytics'),
            marketingConsent: hasConsent('marketing'),
            firstLandingURL: getFirstLandingURL(),
            eventType: 'tracking_init',
            consentManager: detectConsentManager()
        });
    }
    
    initTracking();

    // Ã¢Å“â€¦ Comprehensive GTM Consent Mode Diagnostic
    function diagnoseGTMConsentMode() {
        console.group('GTM Consent Mode Diagnostic');
        
        // Check if GTM is loaded
        console.log('1Ã¯Â¸ÂÃ¢Æ’Â£ GTM Loading Status:');
        console.log('   - gtag function exists:', typeof gtag !== 'undefined');
        console.log('   - gtag type:', typeof gtag);
        
        if (typeof gtag !== 'undefined') {
            console.log('   - gtag function properties:', Object.keys(gtag));
            console.log('   - gtag.consent exists:', !!gtag.consent);
            
            if (gtag.consent) {
                console.log('   - gtag.consent properties:', Object.keys(gtag.consent));
                console.log('   - gtag.consent.get type:', typeof gtag.consent.get);
                console.log('   - gtag.consent.update type:', typeof gtag.consent.update);
                console.log('   - gtag.consent.default type:', typeof gtag.consent.default);
            }
        }
        
        // Check dataLayer
        console.log('2Ã¯Â¸ÂÃ¢Æ’Â£ DataLayer Status:');
        console.log('   - dataLayer exists:', !!window.dataLayer);
        if (window.dataLayer) {
            console.log('   - dataLayer length:', window.dataLayer.length);
            console.log('   - dataLayer type:', typeof window.dataLayer);
            console.log('   - dataLayer constructor:', window.dataLayer.constructor.name);
            
            // Check for GTM loading events
            var gtmEvents = window.dataLayer.filter(function(item) {
                return item && (item.event === 'gtm.js' || item.event === 'gtm.load' || item.event === 'consent');
            });
            console.log('   - GTM events found:', gtmEvents.length);
            gtmEvents.forEach(function(event, index) {
                console.log('     Event ' + index + ':', event);
            });
        }
        
        // Check for GTM script tags
        console.log('3Ã¯Â¸ÂÃ¢Æ’Â£ GTM Script Tags:');
        var gtmScripts = document.querySelectorAll('script[src*="googletagmanager"]');
        console.log('   - GTM script tags found:', gtmScripts.length);
        gtmScripts.forEach(function(script, index) {
            console.log('     Script ' + index + ':', script.src);
        });
        
        // Check for consent mode configuration
        console.log('4Ã¯Â¸ÂÃ¢Æ’Â£ Consent Mode Configuration:');
        var consentScripts = document.querySelectorAll('script');
        var consentConfigFound = false;
        consentScripts.forEach(function(script) {
            if (script.textContent && script.textContent.includes('consent')) {
                console.log('   - Potential consent config found in script:', script.textContent.substring(0, 200) + '...');
                consentConfigFound = true;
            }
        });
        if (!consentConfigFound) {
            console.log('   - No consent configuration found in script tags');
        }
        
        // Check for OneTrust
        console.log('5Ã¯Â¸ÂÃ¢Æ’Â£ OneTrust Status:');
        var oneTrustScripts = document.querySelectorAll('script[src*="onetrust"]');
        console.log('   - OneTrust script tags found:', oneTrustScripts.length);
        var optanonConsent = getCookie('OptanonConsent');
        console.log('   - OneTrust consent cookie exists:', !!optanonConsent);
        if (optanonConsent) {
            console.log('   - OneTrust cookie value:', optanonConsent);
        }
        
        // Check for other consent management platforms
        console.log('6Ã¯Â¸ÂÃ¢Æ’Â£ Other Consent Platforms:');
        var cookieConsent = getCookie('cookieconsent_status');
        console.log('   - CookieConsent cookie exists:', !!cookieConsent);
        var cookiebot = getCookie('CookieConsent');
        console.log('   - Cookiebot cookie exists:', !!cookiebot);
        
        // Test consent mode functionality
        console.log('7Ã¯Â¸ÂÃ¢Æ’Â£ Consent Mode Functionality Test:');
        if (typeof gtag !== 'undefined' && gtag.consent && typeof gtag.consent.get === 'function') {
            try {
                var testConsent = gtag.consent.get();
                console.log('   - Consent mode get() works:', !!testConsent);
                console.log('   - Test consent result:', testConsent);
            } catch (e) {
                console.error('   - Consent mode get() failed:', e);
            }
        } else {
            console.log('   - Consent mode get() not available');
        }
        
        // Recommendations
        console.log('8Ã¯Â¸ÂÃ¢Æ’Â£ Recommendations:');
        if (typeof gtag === 'undefined') {
            console.log('   Ã¢ÂÅ’ GTM is not loaded - add GTM script to page');
        } else if (!gtag.consent) {
            console.log('   Ã¢ÂÅ’ GTM Consent Mode not enabled - configure consent mode in GTM');
        } else if (typeof gtag.consent.get !== 'function') {
            console.log('   Ã¢ÂÅ’ GTM Consent Mode API not available - check GTM version');
        } else {
            console.log('   [OK] GTM Consent Mode appears to be properly configured');
        }
        
        console.groupEnd();
        
        return {
            gtmLoaded: typeof gtag !== 'undefined',
            consentModeAvailable: typeof gtag !== 'undefined' && gtag.consent && typeof gtag.consent.get === 'function',
            dataLayerAvailable: !!window.dataLayer,
            oneTrustAvailable: !!optanonConsent,
            recommendations: []
        };
    }
    
    // Ã¢Å“â€¦ Public diagnostic function
    window.diagnoseGTMConsentMode = diagnoseGTMConsentMode;

})();