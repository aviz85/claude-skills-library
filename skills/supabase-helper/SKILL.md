---
name: supabase-helper
description: |
  Supabase development helper for the mesimot-X task management project. Provides guidance for: (1) Creating database migrations with proper RLS policies, (2) Working with Supabase JS client v2 - queries, inserts, updates, deletes, (3) Setting up real-time subscriptions for live updates, (4) Managing the local Supabase stack (start/stop/reset), (5) Database schema design with Hebrew content support. Use when working with Supabase backend, database operations, or real-time features.
---

# Supabase Helper

Helper for Supabase development in the mesimot-X Hebrew task management app.

## Project Context

- **Frontend**: Single-file `index.html` with Supabase JS v2 via CDN
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Language**: Hebrew UI with RTL layout
- **Local ports**: API 54321, DB 54322, Studio 54323, Email 54324

## Quick Commands

```bash
# Start local stack
supabase start

# Stop services
supabase stop

# Create migration
supabase migration new <name>

# Reset database (runs all migrations)
supabase db reset

# Push to remote
supabase db push
```

## Database Patterns

### Creating Tables

```sql
CREATE TABLE IF NOT EXISTS table_name (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- columns here
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Dev policy (replace with auth-based in production)
CREATE POLICY "Allow all for dev" ON table_name
  FOR ALL USING (true) WITH CHECK (true);
```

### Auto-update updated_at

```sql
CREATE TRIGGER update_table_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

The `update_updated_at_column()` function exists in this project.

## JS Client Patterns

### Initialize Client

```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
```

### Query with Relations

```javascript
const { data, error } = await supabaseClient
  .from('tasks')
  .select(`
    *,
    categories (id, name, color)
  `)
  .order('created_at', { ascending: false });
```

### Insert

```javascript
const { data, error } = await supabaseClient
  .from('tasks')
  .insert([{ title: 'משימה חדשה', completed: false }])
  .select();
```

### Update

```javascript
const { error } = await supabaseClient
  .from('tasks')
  .update({ completed: true })
  .eq('id', taskId);
```

### Delete

```javascript
const { error } = await supabaseClient
  .from('tasks')
  .delete()
  .eq('id', taskId);
```

### Filter

```javascript
// Equality
.eq('column', value)

// Not null
.not('column', 'is', null)

// Multiple conditions
.eq('completed', false).eq('category_id', categoryId)
```

## Real-time Subscriptions

```javascript
supabaseClient
  .channel('channel-name')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'tasks' },
    (payload) => {
      console.log('Change:', payload);
      // Reload data or update UI
    }
  )
  .subscribe();
```

Events: `INSERT`, `UPDATE`, `DELETE`, or `*` for all.

## References

- [schema.md](references/schema.md) - Current database schema
- [rls-policies.md](references/rls-policies.md) - RLS policy patterns for production
