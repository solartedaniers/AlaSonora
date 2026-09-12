package com.alasonora.backend.async;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import com.alasonora.backend.config.AiProperties;

/**
 * Bulkhead: AI classification work (downloading the recording + calling the
 * Python engine) runs on its own bounded thread pool, completely isolated
 * from Tomcat's HTTP worker threads. A slow or stuck AI engine can then
 * never starve the rest of the application's request handling.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    private final AiProperties aiProperties;

    public AsyncConfig(AiProperties aiProperties) {
        this.aiProperties = aiProperties;
    }

    @Bean
    Executor aiTaskExecutor() {
        AiProperties.Executor config = aiProperties.executor();

        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(config.corePoolSize());
        executor.setMaxPoolSize(config.maxPoolSize());
        executor.setQueueCapacity(config.queueCapacity());
        executor.setThreadNamePrefix("ai-task-");
        // Backpressure safeguard: once the pool and its queue are saturated,
        // run the task on the calling thread instead of rejecting it outright
        // or growing the pool unboundedly.
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
