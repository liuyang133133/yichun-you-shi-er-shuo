-- AlterTable
ALTER TABLE `posts` ADD COLUMN `area_id` BIGINT NULL;

-- CreateIndex
CREATE INDEX `posts_area_id_status_created_at_idx` ON `posts`(`area_id`, `status`, `created_at`);

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
