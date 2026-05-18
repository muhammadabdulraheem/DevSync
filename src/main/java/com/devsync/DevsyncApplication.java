package com.devsync;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DevsyncApplication {

    public static void main(String[] args) {
        SpringApplication.run(DevsyncApplication.class, args);
    }

}
//@CrossOrigin(origins = "http://localhost:5173")
//if system not worked as expected
//to
//@CrossOrigin(origins = {"http://localhost:5173", "https://vecil oen app.app"})