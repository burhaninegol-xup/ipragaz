drop extension if exists "pg_net";


  create table "public"."customer_prices" (
    "id" uuid not null default gen_random_uuid(),
    "customer_id" uuid not null,
    "product_id" uuid not null,
    "dealer_id" uuid not null,
    "unit_price" numeric(10,2) not null,
    "commitment_quantity" integer default 0,
    "this_month_quantity" integer default 0,
    "last_month_quantity" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."customers" (
    "id" uuid not null default gen_random_uuid(),
    "vkn" character varying(20),
    "name" character varying(255) not null,
    "company_name" character varying(255),
    "phone" character varying(20) not null,
    "email" character varying(255),
    "address" text,
    "dealer_id" uuid,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "sector" character varying(50),
    "tabela_unvani" character varying(255)
      );



  create table "public"."dealers" (
    "id" uuid not null default gen_random_uuid(),
    "code" character varying(50) not null,
    "name" character varying(255) not null,
    "city" character varying(100),
    "district" character varying(100),
    "phone" character varying(20),
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."order_items" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "product_id" uuid not null,
    "quantity" integer not null,
    "unit_price" numeric(10,2) not null,
    "total_price" numeric(10,2) not null,
    "points" integer default 0,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "order_number" character varying(50),
    "customer_id" uuid,
    "dealer_id" uuid,
    "status" character varying(50) default 'pending'::character varying,
    "total_amount" numeric(12,2) not null,
    "total_points" integer default 0,
    "delivery_address" text,
    "delivery_date" date,
    "payment_method" character varying(50),
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "delivery_time" character varying(50)
      );



  create table "public"."products" (
    "id" uuid not null default gen_random_uuid(),
    "code" character varying(50) not null,
    "name" character varying(255) not null,
    "weight_kg" numeric(5,2),
    "category" character varying(50),
    "base_price" numeric(10,2) not null,
    "points_per_unit" integer default 0,
    "image_url" character varying(500),
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


CREATE UNIQUE INDEX customer_prices_customer_id_product_id_dealer_id_key ON public.customer_prices USING btree (customer_id, product_id, dealer_id);

CREATE UNIQUE INDEX customer_prices_pkey ON public.customer_prices USING btree (id);

CREATE UNIQUE INDEX customers_phone_unique ON public.customers USING btree (phone);

CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);

CREATE UNIQUE INDEX customers_vkn_key ON public.customers USING btree (vkn);

CREATE UNIQUE INDEX dealers_code_key ON public.dealers USING btree (code);

CREATE UNIQUE INDEX dealers_pkey ON public.dealers USING btree (id);

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE UNIQUE INDEX orders_order_number_key ON public.orders USING btree (order_number);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX products_code_key ON public.products USING btree (code);

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);

alter table "public"."customer_prices" add constraint "customer_prices_pkey" PRIMARY KEY using index "customer_prices_pkey";

alter table "public"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "public"."dealers" add constraint "dealers_pkey" PRIMARY KEY using index "dealers_pkey";

alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "public"."customer_prices" add constraint "customer_prices_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;

alter table "public"."customer_prices" validate constraint "customer_prices_customer_id_fkey";

alter table "public"."customer_prices" add constraint "customer_prices_customer_id_product_id_dealer_id_key" UNIQUE using index "customer_prices_customer_id_product_id_dealer_id_key";

alter table "public"."customer_prices" add constraint "customer_prices_dealer_id_fkey" FOREIGN KEY (dealer_id) REFERENCES public.dealers(id) ON DELETE CASCADE not valid;

alter table "public"."customer_prices" validate constraint "customer_prices_dealer_id_fkey";

alter table "public"."customer_prices" add constraint "customer_prices_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."customer_prices" validate constraint "customer_prices_product_id_fkey";

alter table "public"."customers" add constraint "customers_dealer_id_fkey" FOREIGN KEY (dealer_id) REFERENCES public.dealers(id) not valid;

alter table "public"."customers" validate constraint "customers_dealer_id_fkey";

alter table "public"."customers" add constraint "customers_phone_unique" UNIQUE using index "customers_phone_unique";

alter table "public"."customers" add constraint "customers_vkn_key" UNIQUE using index "customers_vkn_key";

alter table "public"."dealers" add constraint "dealers_code_key" UNIQUE using index "dealers_code_key";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) not valid;

alter table "public"."order_items" validate constraint "order_items_product_id_fkey";

alter table "public"."orders" add constraint "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."orders" validate constraint "orders_customer_id_fkey";

alter table "public"."orders" add constraint "orders_dealer_id_fkey" FOREIGN KEY (dealer_id) REFERENCES public.dealers(id) not valid;

alter table "public"."orders" validate constraint "orders_dealer_id_fkey";

alter table "public"."orders" add constraint "orders_order_number_key" UNIQUE using index "orders_order_number_key";

alter table "public"."products" add constraint "products_code_key" UNIQUE using index "products_code_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'ORD-' || to_char(NOW(), 'YYYYMMDD') || '-' || substring(gen_random_uuid()::text, 1, 6);
    END IF;
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."customer_prices" to "anon";

grant insert on table "public"."customer_prices" to "anon";

grant references on table "public"."customer_prices" to "anon";

grant select on table "public"."customer_prices" to "anon";

grant trigger on table "public"."customer_prices" to "anon";

grant truncate on table "public"."customer_prices" to "anon";

grant update on table "public"."customer_prices" to "anon";

grant delete on table "public"."customer_prices" to "authenticated";

grant insert on table "public"."customer_prices" to "authenticated";

grant references on table "public"."customer_prices" to "authenticated";

grant select on table "public"."customer_prices" to "authenticated";

grant trigger on table "public"."customer_prices" to "authenticated";

grant truncate on table "public"."customer_prices" to "authenticated";

grant update on table "public"."customer_prices" to "authenticated";

grant delete on table "public"."customer_prices" to "service_role";

grant insert on table "public"."customer_prices" to "service_role";

grant references on table "public"."customer_prices" to "service_role";

grant select on table "public"."customer_prices" to "service_role";

grant trigger on table "public"."customer_prices" to "service_role";

grant truncate on table "public"."customer_prices" to "service_role";

grant update on table "public"."customer_prices" to "service_role";

grant delete on table "public"."customers" to "anon";

grant insert on table "public"."customers" to "anon";

grant references on table "public"."customers" to "anon";

grant select on table "public"."customers" to "anon";

grant trigger on table "public"."customers" to "anon";

grant truncate on table "public"."customers" to "anon";

grant update on table "public"."customers" to "anon";

grant delete on table "public"."customers" to "authenticated";

grant insert on table "public"."customers" to "authenticated";

grant references on table "public"."customers" to "authenticated";

grant select on table "public"."customers" to "authenticated";

grant trigger on table "public"."customers" to "authenticated";

grant truncate on table "public"."customers" to "authenticated";

grant update on table "public"."customers" to "authenticated";

grant delete on table "public"."customers" to "service_role";

grant insert on table "public"."customers" to "service_role";

grant references on table "public"."customers" to "service_role";

grant select on table "public"."customers" to "service_role";

grant trigger on table "public"."customers" to "service_role";

grant truncate on table "public"."customers" to "service_role";

grant update on table "public"."customers" to "service_role";

grant delete on table "public"."dealers" to "anon";

grant insert on table "public"."dealers" to "anon";

grant references on table "public"."dealers" to "anon";

grant select on table "public"."dealers" to "anon";

grant trigger on table "public"."dealers" to "anon";

grant truncate on table "public"."dealers" to "anon";

grant update on table "public"."dealers" to "anon";

grant delete on table "public"."dealers" to "authenticated";

grant insert on table "public"."dealers" to "authenticated";

grant references on table "public"."dealers" to "authenticated";

grant select on table "public"."dealers" to "authenticated";

grant trigger on table "public"."dealers" to "authenticated";

grant truncate on table "public"."dealers" to "authenticated";

grant update on table "public"."dealers" to "authenticated";

grant delete on table "public"."dealers" to "service_role";

grant insert on table "public"."dealers" to "service_role";

grant references on table "public"."dealers" to "service_role";

grant select on table "public"."dealers" to "service_role";

grant trigger on table "public"."dealers" to "service_role";

grant truncate on table "public"."dealers" to "service_role";

grant update on table "public"."dealers" to "service_role";

grant delete on table "public"."order_items" to "anon";

grant insert on table "public"."order_items" to "anon";

grant references on table "public"."order_items" to "anon";

grant select on table "public"."order_items" to "anon";

grant trigger on table "public"."order_items" to "anon";

grant truncate on table "public"."order_items" to "anon";

grant update on table "public"."order_items" to "anon";

grant delete on table "public"."order_items" to "authenticated";

grant insert on table "public"."order_items" to "authenticated";

grant references on table "public"."order_items" to "authenticated";

grant select on table "public"."order_items" to "authenticated";

grant trigger on table "public"."order_items" to "authenticated";

grant truncate on table "public"."order_items" to "authenticated";

grant update on table "public"."order_items" to "authenticated";

grant delete on table "public"."order_items" to "service_role";

grant insert on table "public"."order_items" to "service_role";

grant references on table "public"."order_items" to "service_role";

grant select on table "public"."order_items" to "service_role";

grant trigger on table "public"."order_items" to "service_role";

grant truncate on table "public"."order_items" to "service_role";

grant update on table "public"."order_items" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."products" to "anon";

grant insert on table "public"."products" to "anon";

grant references on table "public"."products" to "anon";

grant select on table "public"."products" to "anon";

grant trigger on table "public"."products" to "anon";

grant truncate on table "public"."products" to "anon";

grant update on table "public"."products" to "anon";

grant delete on table "public"."products" to "authenticated";

grant insert on table "public"."products" to "authenticated";

grant references on table "public"."products" to "authenticated";

grant select on table "public"."products" to "authenticated";

grant trigger on table "public"."products" to "authenticated";

grant truncate on table "public"."products" to "authenticated";

grant update on table "public"."products" to "authenticated";

grant delete on table "public"."products" to "service_role";

grant insert on table "public"."products" to "service_role";

grant references on table "public"."products" to "service_role";

grant select on table "public"."products" to "service_role";

grant trigger on table "public"."products" to "service_role";

grant truncate on table "public"."products" to "service_role";

grant update on table "public"."products" to "service_role";

CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();


