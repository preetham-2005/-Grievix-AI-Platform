package com.grievix.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter implements Filter {

    private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS = 60; // 60 requests
    private static final long TIME_WINDOW_MS = 60000; // per minute

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest httpRequest && response instanceof HttpServletResponse httpResponse) {
            String ip = getClientIP(httpRequest);
            
            // Skip H2 Console and documentation from rate limiting in dev environment
            String uri = httpRequest.getRequestURI();
            if (uri.startsWith("/h2-console") || uri.startsWith("/swagger") || uri.startsWith("/v3/api-docs")) {
                chain.doFilter(request, response);
                return;
            }

            TokenBucket bucket = buckets.computeIfAbsent(ip, k -> new TokenBucket());
            if (!bucket.tryConsume()) {
                httpResponse.setStatus(429); // Too Many Requests
                httpResponse.setContentType("application/json");
                httpResponse.getWriter().write("{\"error\": \"Too many requests. Please try again in a minute.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    private static class TokenBucket {
        private final AtomicInteger tokens = new AtomicInteger(MAX_REQUESTS);
        private long lastRefillTime = System.currentTimeMillis();

        public synchronized boolean tryConsume() {
            refill();
            if (tokens.get() > 0) {
                tokens.decrementAndGet();
                return true;
            }
            return false;
        }

        private void refill() {
            long now = System.currentTimeMillis();
            if (now - lastRefillTime > TIME_WINDOW_MS) {
                tokens.set(MAX_REQUESTS);
                lastRefillTime = now;
            }
        }
    }
}
