ALTER TABLE `content` ADD COLUMN `slug` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `content_type_slug_unique` ON `content` (`content_type`, `slug`) WHERE `slug` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `content_slug_idx` ON `content` (`slug`);
--> statement-breakpoint
UPDATE `content` SET `slug` = CASE
  WHEN `release_date` IS NOT NULL THEN
    lower(replace(replace(replace(replace(`title`, ' ', '-'), '''', ''), '"', ''), ',', '')) || '-' || cast(strftime('%Y', `release_date` / 1000, 'unixepoch') as text)
  ELSE
    lower(replace(replace(replace(replace(`title`, ' ', '-'), '''', ''), '"', ''), ',', ''))
END
WHERE `slug` IS NULL;
--> statement-breakpoint
UPDATE `content` SET `slug` = replace(replace(`slug`, '--', '-'), '--', '-')
WHERE `slug` LIKE '%--%';
--> statement-breakpoint
CREATE TRIGGER `content_slug_auto_insert`
AFTER INSERT ON `content`
WHEN NEW.`slug` IS NULL
BEGIN
  UPDATE `content` SET `slug` = CASE
    WHEN NEW.`release_date` IS NOT NULL THEN
      lower(replace(replace(replace(replace(NEW.`title`, ' ', '-'), '''', ''), '"', ''), ',', '')) || '-' || cast(strftime('%Y', NEW.`release_date` / 1000, 'unixepoch') as text)
    ELSE
      lower(replace(replace(replace(replace(NEW.`title`, ' ', '-'), '''', ''), '"', ''), ',', ''))
  END
  WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `content_slug_auto_update`
AFTER UPDATE OF `title`, `release_date` ON `content`
WHEN NEW.`title` != OLD.`title` OR (NEW.`release_date` IS NOT OLD.`release_date`)
BEGIN
  UPDATE `content` SET `slug` = CASE
    WHEN NEW.`release_date` IS NOT NULL THEN
      lower(replace(replace(replace(replace(NEW.`title`, ' ', '-'), '''', ''), '"', ''), ',', '')) || '-' || cast(strftime('%Y', NEW.`release_date` / 1000, 'unixepoch') as text)
    ELSE
      lower(replace(replace(replace(replace(NEW.`title`, ' ', '-'), '''', ''), '"', ''), ',', ''))
  END
  WHERE `id` = NEW.`id`;
END;
