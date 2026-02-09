/**
 * TIWI Unified Datafeed (Dual-Mode)
 * Corrected for Next.js /public and React Native Bridge
 */

// IMPORTANT: Update this ngrok URL whenever it changes
const API_BASE = "https://81c9-105-112-216-223.ngrok-free.app";

window.tiwiDatafeed = {
    onReady: (callback) => {
        logToNative("Datafeed: onReady called");
        setTimeout(() => callback({
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true,
            supported_resolutions: ["1", "5", "15", "30", "60", "240", "D", "W"]
        }), 0);
    },

    searchSymbols: (userInput, exchange, symbolType, onResultReadyCallback) => {
        onResultReadyCallback([]);
    },

    resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
        logToNative("Datafeed: resolveSymbol -> " + symbolName);

        const request = {
            id: Date.now() + Math.random(),
            type: 'RESOLVE_SYMBOL',
            symbol: symbolName
        };

        if (window.ReactNativeWebView) {
            window.sendNativeMessage(request, (response) => {
                if (response.error) onResolveErrorCallback(response.error);
                else onSymbolResolvedCallback(response.data);
            });
        } else {
            // WEB FALLBACK: Metadata for browser testing
            setTimeout(() => {
                onSymbolResolvedCallback({
                    name: symbolName,
                    ticker: symbolName,
                    description: symbolName,
                    type: 'crypto',
                    session: '24x7',
                    timezone: 'Etc/UTC',
                    exchange: 'TIWI',
                    minmov: 1,
                    pricescale: 100,
                    has_intraday: true,
                    supported_resolutions: ["1", "5", "15", "60", "240", "D", "W"],
                });
            }, 0);
        }
    },

    getBars: (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
        if (window.ReactNativeWebView) {
            const request = {
                id: Date.now() + Math.random(),
                type: 'GET_BARS',
                symbol: symbolInfo.name,
                resolution: resolution,
                from: periodParams.from,
                to: periodParams.to,
                countBack: periodParams.countBack
            };
            window.sendNativeMessage(request, (response) => {
                if (response.error) onErrorCallback(response.error);
                else onHistoryCallback(response.data, { noData: response.data.length === 0 });
            });
        } else {
            // WEB MODE: Direct fetch with NORMALIZER
            const url = `${API_BASE}/api/v1/charts/history?symbol=${symbolInfo.name}&resolution=${resolution}&from=${periodParams.from}&to=${periodParams.to}`;
            logToNative("Web Mode Fetching: " + url);

            fetch(url)
                .then(res => res.json())
                .then(history => {
                    let bars = [];
                    // Handle UDF format
                    if (history.t && Array.isArray(history.t)) {
                        bars = history.t.map((time, i) => ({
                            time: time * 1000,
                            low: history.l[i],
                            high: history.h[i],
                            open: history.o[i],
                            close: history.c[i],
                            volume: history.v ? history.v[i] : 0
                        }));
                    }
                    // Handle Array format
                    else if (Array.isArray(history)) {
                        bars = history.map(b => ({
                            time: (b.time || b.t || 0) * 1000,
                            open: b.open || b.o,
                            high: b.high || b.h,
                            low: b.low || b.l,
                            close: b.close || b.c,
                            volume: b.volume || b.v || 0
                        }));
                    }

                    onHistoryCallback(bars, { noData: bars.length === 0 });
                })
                .catch(err => {
                    logToNative("Web Fetch Error: " + err.message);
                    onErrorCallback(err);
                });
        }
    },

    subscribeBars: (symbolInfo, resolution, onRealtimeCallback) => {
        window.onRealtimeCallback = onRealtimeCallback;
    },

    unsubscribeBars: () => {
        window.onRealtimeCallback = null;
    }
};

// --- Bridge Helpers ---
const pendingRequests = new Map();

window.sendNativeMessage = (request, callback) => {
    pendingRequests.set(request.id, callback);
    try {
        window.ReactNativeWebView.postMessage(JSON.stringify(request));
    } catch (e) {
        logToNative("postMessage Error: " + e.message);
    }
};

window.onNativeResponse = (response) => {
    const callback = pendingRequests.get(response.requestId);
    if (callback) {
        callback(response);
        pendingRequests.delete(response.requestId);
    }
};

window.updateLastPrice = (bar) => {
    if (window.onRealtimeCallback) {
        window.onRealtimeCallback(bar);
    }
};

function logToNative(msg) {
    if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', message: msg }));
    } else {
        console.log(msg);
    }
}
// /**
//  * TIWI Unified Datafeed (Dual-Mode)
//  * Optimized for Next.js /public and React Native Bridge
//  */

// // Use the backend URL from your environment or window location
// const API_BASE = "https://81c9-105-112-216-223.ngrok-free.app";

// window.tiwiDatafeed = {
//     onReady: (callback) => {
//         setTimeout(() => callback({
//             supports_marks: false,
//             supports_timescale_marks: false,
//             supports_time: true,
//             supported_resolutions: ["1", "5", "15", "60", "240", "D", "W"]
//         }), 0);
//     },

//     searchSymbols: (userInput, exchange, symbolType, onResultReadyCallback) => {
//         onResultReadyCallback([]);
//     },

//     resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
//         const request = {
//             id: Date.now() + Math.random(),
//             type: 'RESOLVE_SYMBOL',
//             symbol: symbolName
//         };

//         if (window.ReactNativeWebView) {
//             window.sendNativeMessage(request, (response) => {
//                 if (response.error) onResolveErrorCallback(response.error);
//                 else onSymbolResolvedCallback(response.data);
//             });
//         } else {
//             // WEB FALLBACK: Default symbol metadata for browser testing
//             setTimeout(() => {
//                 onSymbolResolvedCallback({
//                     name: symbolName,
//                     ticker: symbolName,
//                     description: symbolName,
//                     type: 'crypto',
//                     session: '24x7',
//                     timezone: 'Etc/UTC',
//                     exchange: 'TIWI',
//                     minmov: 1,
//                     pricescale: 100,
//                     has_intraday: true,
//                     supported_resolutions: ["1", "5", "15", "60", "240", "D", "W"],
//                 });
//             }, 0);
//         }
//     },

//     getBars: (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
//         if (window.ReactNativeWebView) {
//             // MOBILE MODE: Request through the bridge
//             const request = {
//                 id: Date.now() + Math.random(),
//                 type: 'GET_BARS',
//                 symbol: symbolInfo.name,
//                 resolution: resolution,
//                 from: periodParams.from,
//                 to: periodParams.to,
//                 countBack: periodParams.countBack
//             };
//             window.sendNativeMessage(request, (response) => {
//                 if (response.error) onErrorCallback(response.error);
//                 else onHistoryCallback(response.data, { noData: response.data.length === 0 });
//             });
//         } else {
//             // WEB MODE: Direct API fetch to get browser version working
//             const url = `${API_BASE}/api/v1/charts/history?symbol=${symbolInfo.name}&resolution=${resolution}&from=${periodParams.from}&to=${periodParams.to}`;
//             fetch(url)
//                 .then(res => res.json())
//                 .then(history => {
//                     const bars = history.t.map((time, i) => ({
//                         time: time * 1000,
//                         low: history.l[i],
//                         high: history.h[i],
//                         open: history.o[i],
//                         close: history.c[i],
//                         volume: history.v ? history.v[i] : 0
//                     }));
//                     onHistoryCallback(bars, { noData: bars.length === 0 });
//                 })
//                 .catch(err => {
//                     console.error("[Datafeed] Web Fetch Error:", err);
//                     onErrorCallback(err);
//                 });
//         }
//     },

//     subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID) => {
//         window.onRealtimeCallback = onRealtimeCallback;
//     },

//     unsubscribeBars: () => {
//         window.onRealtimeCallback = null;
//     }
// };

// // --- Bridge Helpers ---
// const pendingRequests = new Map();
// window.sendNativeMessage = (request, callback) => {
//     pendingRequests.set(request.id, callback);
//     window.ReactNativeWebView.postMessage(JSON.stringify(request));
// };

// window.onNativeResponse = (response) => {
//     const callback = pendingRequests.get(response.requestId);
//     if (callback) {
//         callback(response);
//         pendingRequests.delete(response.requestId);
//     }
// };

// window.updateLastPrice = (bar) => {
//     if (window.onRealtimeCallback) {
//         window.onRealtimeCallback(bar);
//     }
// };
