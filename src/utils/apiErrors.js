class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""   // ⚠️ small typo, should be "stack"
    ){
        super(message);  // calls parent Error(message)

        // custom fields for API response
        this.statusCode = statusCode;  
        this.data = null;   // can hold extra data if needed
        this.message = message;  
        this.success = false;  
        this.errors = errors;  // array of error details (validation errors, etc.)

        // stack trace handling
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default ApiError;