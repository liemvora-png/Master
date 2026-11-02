-- Replace em dashes in stored page browser titles (antislop R-02).
UPDATE pages
   SET meta_title = replace(meta_title, ' — ', ': ')
 WHERE meta_title LIKE '%—%';
