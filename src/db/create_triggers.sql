DELIMITER $$

CREATE TRIGGER set_first_user_admin
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    DECLARE user_count INT;
    SELECT COUNT(*) INTO user_count FROM users;

    IF user_count = 0 THEN
        SET NEW.role = 'ADMIN';
    ELSEIF NEW.role IS NULL THEN
        SET NEW.role = 'USER';
    END IF;
END$$

DELIMITER ;
