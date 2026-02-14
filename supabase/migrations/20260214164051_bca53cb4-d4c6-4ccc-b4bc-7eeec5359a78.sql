
-- Create storage bucket for resume uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Allow authenticated users to upload their own resumes
CREATE POLICY "Users can upload own resumes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own resumes
CREATE POLICY "Users can read own resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own resumes
CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
