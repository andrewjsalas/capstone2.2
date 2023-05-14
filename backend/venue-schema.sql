-- Tables for venue_db
create table users(
    id serial primary key,
    username varchar(255) not null unique,
    password varchar(255) not null,
    tokens text[] default '{}'
);

create table posts(
    id serial primary key,
    title varchar(255) not null,
    body text,
    author_id int,
    created_at timestamptz default now(),
    constraint fk_author
        foreign key(author_id)
            references users(id)
            on delete set null
);

create table post_votes(
    users_id int not null,
    post_id int not null,
    vote_value int not null check (-1 <= vote_value and vote_value <= 1),
    primary key (users_id, post_id),
    constraint fk_user
        foreign key(user_id)
            references users(id)
            on delete cascade,
    constraint fk_post 
        foreign key(post_id)
            references posts(id)
            on delete cascade
);

create table comments(
    id serial primary key,
    body text, 
    author_id int,
    post_id int,
    parent_comment_id int,
    created_at timestamptz default now(),
    constraint fk_author
        foreign key(author_id)
            references users(id)
            on delete set null,
    constraint fk_post
        foreign key(post_id)
            references posts(id)
            on delete set null,
    constraint fk_parent_comment
        foreign key(parent_comment_id)
            references comments(id)
            on delete set null
);

