package com.ota;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.ota.mapper")
public class OtaServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(OtaServerApplication.class, args);
    }
}
