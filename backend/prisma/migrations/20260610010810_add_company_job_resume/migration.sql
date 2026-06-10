-- CreateTable
CREATE TABLE `companies` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `creator_user_id` BIGINT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `logo` VARCHAR(255) NULL,
    `industry` VARCHAR(50) NULL,
    `scale` VARCHAR(30) NULL,
    `nature` VARCHAR(30) NULL,
    `address` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `verified` TINYINT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `companies_creator_user_id_idx`(`creator_user_id`),
    INDEX `companies_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_jobs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT NOT NULL,
    `company_id` BIGINT NOT NULL,
    `job_type` VARCHAR(20) NOT NULL,
    `salary_min` DECIMAL(10, 2) NULL,
    `salary_max` DECIMAL(10, 2) NULL,
    `salary_unit` VARCHAR(20) NULL,
    `education` VARCHAR(20) NULL,
    `experience` VARCHAR(20) NULL,
    `industry` VARCHAR(50) NULL,
    `welfare` JSON NULL,
    `recruit_count` INTEGER NOT NULL DEFAULT 1,
    `work_city` VARCHAR(50) NULL,
    `work_address` VARCHAR(255) NULL,

    UNIQUE INDEX `post_jobs_post_id_key`(`post_id`),
    INDEX `post_jobs_company_id_idx`(`company_id`),
    INDEX `post_jobs_salary_min_salary_max_idx`(`salary_min`, `salary_max`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resumes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `gender` TINYINT NOT NULL DEFAULT 0,
    `age` INTEGER NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `education` VARCHAR(20) NULL,
    `experience` VARCHAR(20) NULL,
    `expected_position` VARCHAR(100) NULL,
    `expected_salary` DECIMAL(10, 2) NULL,
    `expected_city` VARCHAR(50) NULL,
    `self_intro` TEXT NULL,
    `is_public` TINYINT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `resumes_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_applications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_job_id` BIGINT NOT NULL,
    `resume_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `coverLetter` VARCHAR(500) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT '已投递',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `job_applications_user_id_created_at_idx`(`user_id`, `created_at`),
    UNIQUE INDEX `job_applications_post_job_id_resume_id_key`(`post_job_id`, `resume_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_creator_user_id_fkey` FOREIGN KEY (`creator_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_jobs` ADD CONSTRAINT `post_jobs_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_jobs` ADD CONSTRAINT `post_jobs_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resumes` ADD CONSTRAINT `resumes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_post_job_id_fkey` FOREIGN KEY (`post_job_id`) REFERENCES `post_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_resume_id_fkey` FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
