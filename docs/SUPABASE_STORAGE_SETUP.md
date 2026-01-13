# Supabase Storage Setup para Avatares

Este documento explica cómo configurar Supabase Storage para permitir la subida de fotos de perfil.

## Paso 1: Crear el Bucket de Storage

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard
2. Navega a **Storage** en el menú lateral
3. Haz clic en **New bucket**
4. Configura el bucket con los siguientes parámetros:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **Marcado** (para que las imágenes sean accesibles públicamente)
   - **File size limit**: 5 MB (o el tamaño que prefieras)
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp,image/gif`

## Paso 2: Configurar Políticas de Seguridad (RLS)

Para que los usuarios solo puedan subir sus propias imágenes, necesitas configurar políticas de Row Level Security (RLS):

1. En el bucket `avatars`, ve a **Policies**
2. Crea una nueva política para **INSERT** (subir archivos):
   ```sql
   -- Permitir a usuarios autenticados subir sus propias imágenes
   CREATE POLICY "Users can upload their own avatars"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'avatars' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

3. Crea una política para **SELECT** (leer archivos):
   ```sql
   -- Permitir lectura pública de avatares
   CREATE POLICY "Public avatar access"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'avatars');
   ```

4. Crea una política para **UPDATE** (actualizar archivos):
   ```sql
   -- Permitir a usuarios actualizar sus propias imágenes
   CREATE POLICY "Users can update their own avatars"
   ON storage.objects FOR UPDATE
   TO authenticated
   USING (
     bucket_id = 'avatars' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

5. Crea una política para **DELETE** (eliminar archivos):
   ```sql
   -- Permitir a usuarios eliminar sus propias imágenes
   CREATE POLICY "Users can delete their own avatars"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (
     bucket_id = 'avatars' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

## Paso 3: Configurar Variables de Entorno

Asegúrate de tener las siguientes variables de entorno configuradas:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
SUPABASE_KEY=tu_supabase_service_role_key
# O alternativamente:
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

**Nota**: Para operaciones del servidor (como subir archivos desde el API), es mejor usar `SUPABASE_KEY` (service role key) que tiene permisos completos. Para operaciones del cliente, usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Paso 4: Verificar la Configuración

1. Intenta subir una imagen desde la página `/perfil`
2. Verifica que la imagen aparezca en el bucket `avatars` en Supabase
3. Verifica que la URL pública funcione y muestre la imagen

## Estructura de Archivos

Las imágenes se guardan con la siguiente estructura:
```
avatars/
  └── {userId}-{timestamp}.{ext}
```

Ejemplo: `avatars/clx123abc-1704067200000.jpg`

## Solución de Problemas

### Error: "Bucket not found"
- Asegúrate de que el bucket `avatars` existe en Supabase Storage
- Verifica que el nombre del bucket sea exactamente `avatars` (case-sensitive)

### Error: "New row violates row-level security policy"
- Verifica que las políticas RLS estén configuradas correctamente
- Si estás usando el service role key en el servidor, las políticas RLS no se aplican (eso está bien para operaciones del servidor)

### Error: "File size too large"
- Verifica el límite de tamaño del bucket (configurado en el paso 1)
- El código actual limita a 5MB, puedes ajustarlo en `app/api/profile/upload-avatar/route.ts`

### Error: "Invalid file type"
- Verifica que el tipo MIME del archivo esté en la lista de tipos permitidos
- Los tipos permitidos son: JPEG, PNG, WebP, GIF

## Notas de Seguridad

1. **Service Role Key**: Nunca expongas el `SUPABASE_KEY` (service role key) en el cliente. Solo úsalo en rutas API del servidor.

2. **Validación**: El código valida tanto en el cliente como en el servidor:
   - Tipo de archivo
   - Tamaño del archivo
   - Existencia del usuario

3. **Nombres de archivo**: Los nombres de archivo incluyen el `userId` para evitar colisiones y facilitar la gestión.

4. **URLs públicas**: Las imágenes son accesibles públicamente. Si necesitas privacidad, considera usar signed URLs en su lugar.
















