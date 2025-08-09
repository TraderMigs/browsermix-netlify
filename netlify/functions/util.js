  /* CORS + preflight helper used by all functions */
   const cors = {
     headers: {
       "Access-Control-Allow-Origin": "*",
       "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
       "Access-Control-Allow-Methods": "POST, OPTIONS"
     }
   };

   exports.preflight = (event) => {
     if (event.httpMethod === "OPTIONS") {
       return { statusCode: 200, headers: cors.headers, body: "" };
     }
     return null;
   };

   exports.corsHeaders = cors.headers;
