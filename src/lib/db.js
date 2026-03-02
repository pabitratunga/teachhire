/**
 * TeachHire — Database Operations (Supabase)
 * All CRUD for: auth, jobs, applications, scraped_jobs, custom_sources
 */
import { supabase } from "./supabase";

// ─── AUTH ─────────────────────────────────────────────────────────────────

export async function dbSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  const profile = await dbGetProfile(data.user.id);
  return { ...data.user, ...profile };
}

export async function dbSignUp(email, password, name, role, institutionName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role } },
  });
  if (error) throw new Error(error.message);

  // Update profile with extra fields (trigger already created the row)
  if (data.user) {
    const patch = { name, role };
    if (role === "recruiter" && institutionName) {
      patch.institution = { name: institutionName, verified: false };
    }
    await supabase.from("profiles").update(patch).eq("id", data.user.id);
  }

  return data.user;
}

export async function dbSignOut() {
  await supabase.auth.signOut();
}

export async function dbGetCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const profile = await dbGetProfile(session.user.id);
  return { ...session.user, ...profile };
}

export async function dbGetProfile(userId) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data || {};
}

// ─── JOBS ──────────────────────────────────────────────────────────────────

export async function dbFetchJobs() {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapJob);
}

export async function dbInsertJob(job) {
  const { data, error } = await supabase
    .from("jobs")
    .insert(jobToDb(job))
    .select()
    .single();
  if (error) throw error;
  return mapJob(data);
}

export async function dbUpdateJob(id, patch) {
  const { error } = await supabase.from("jobs").update(jobToDb(patch)).eq("id", id);
  if (error) throw error;
}

// Map DB row → app object
function mapJob(j) {
  return {
    id: j.id,
    title: j.title,
    institution: j.institution,
    categories: j.categories || [],
    subjects: j.subjects || [],
    states: j.states || [],
    cities: j.cities || [],
    ownership: j.ownership,
    academicLevel: j.academic_level,
    employmentType: j.employment_type,
    workMode: j.work_mode,
    salaryMin: j.salary_min,
    salaryMax: j.salary_max,
    deadline: j.deadline,
    description: j.description,
    status: j.status,
    postedDate: j.posted_date,
    recruiterId: j.recruiter_id,
    verified: j.verified,
    featured: j.featured,
    applicants: j.applicants,
    source_url: j.source_url,
    postedBy: j.posted_by,
    vacancies: j.vacancies,
    demoClass: j.demo_class,
    writtenTest: j.written_test,
    rounds: j.rounds,
    archivedDate: j.archived_date,
    archivedBy: j.archived_by,
    institutionCategory: j.institution_category,
    minQualification: j.min_qualification,
  };
}

// Map app object → DB row
function jobToDb(j) {
  const db = {};
  const set = (dbKey, val) => { if (val !== undefined) db[dbKey] = val; };
  set("title",               j.title);
  set("institution",         j.institution);
  set("categories",          j.categories);
  set("subjects",            j.subjects);
  set("states",              j.states);
  set("cities",              j.cities);
  set("ownership",           j.ownership);
  set("academic_level",      j.academicLevel);
  set("employment_type",     j.employmentType);
  set("work_mode",           j.workMode);
  set("salary_min",          j.salaryMin);
  set("salary_max",          j.salaryMax);
  set("deadline",            j.deadline);
  set("description",         j.description);
  set("status",              j.status);
  set("posted_date",         j.postedDate);
  set("recruiter_id",        j.recruiterId);
  set("verified",            j.verified);
  set("featured",            j.featured);
  set("applicants",          j.applicants);
  set("source_url",          j.source_url);
  set("posted_by",           j.postedBy);
  set("vacancies",           j.vacancies);
  set("demo_class",          j.demoClass);
  set("written_test",        j.writtenTest);
  set("rounds",              j.rounds);
  set("archived_date",       j.archivedDate);
  set("archived_by",         j.archivedBy);
  set("institution_category",j.institutionCategory);
  set("min_qualification",   j.minQualification);
  return db;
}

// ─── APPLICATIONS ──────────────────────────────────────────────────────────

export async function dbFetchApplications() {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapApp);
}

export async function dbInsertApplication(app) {
  const { data, error } = await supabase
    .from("applications")
    .insert({
      job_id:       app.jobId,
      candidate_id: app.candidateId,
      status:       app.status || "Applied",
      applied_date: app.appliedDate,
      notes:        app.notes  || [],
      rounds:       app.rounds || [],
    })
    .select()
    .single();
  if (error) throw error;
  return mapApp(data);
}

export async function dbUpdateApplication(id, patch) {
  const dbPatch = {};
  if (patch.status  !== undefined) dbPatch.status  = patch.status;
  if (patch.notes   !== undefined) dbPatch.notes   = patch.notes;
  if (patch.rounds  !== undefined) dbPatch.rounds  = patch.rounds;
  const { error } = await supabase.from("applications").update(dbPatch).eq("id", id);
  if (error) throw error;
}

function mapApp(a) {
  return {
    id:          a.id,
    jobId:       a.job_id,
    candidateId: a.candidate_id,
    status:      a.status,
    appliedDate: a.applied_date,
    notes:       a.notes  || [],
    rounds:      a.rounds || [],
  };
}

// ─── SCRAPED JOBS ──────────────────────────────────────────────────────────

export async function dbFetchScrapedJobs() {
  const { data, error } = await supabase
    .from("scraped_jobs")
    .select("*")
    .order("scraped_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapScraped);
}

export async function dbUpsertScrapedJobs(jobs) {
  if (!jobs.length) return;
  const { error } = await supabase.from("scraped_jobs").upsert(
    jobs.map(j => ({
      id:              j.id,
      title:           j.title,
      institution:     j.institution,
      description:     j.description,
      source_url:      j.source_url,
      source_site:     j.source_site,
      source_name:     j.source_name,
      scraped_at:      j.scraped_at,
      deadline:        j.deadline,
      status:          j.status || "pending_review",
      categories:      j.categories  || [],
      subjects:        j.subjects    || [],
      states:          j.states      || [],
      cities:          j.cities      || [],
      ownership:       j.ownership   || "Government",
      employment_type: j.employmentType,
      academic_level:  j.academicLevel,
      salary_min:      j.salaryMin   || 0,
      salary_max:      j.salaryMax   || 0,
      vacancies:       j.vacancies   || 1,
    })),
    { onConflict: "id", ignoreDuplicates: false }
  );
  if (error) console.error("Scraped jobs upsert error:", error);
}

export async function dbUpdateScrapedJobStatus(id, status) {
  const { error } = await supabase.from("scraped_jobs").update({ status }).eq("id", id);
  if (error) throw error;
}

function mapScraped(j) {
  return {
    id:            j.id,
    title:         j.title,
    institution:   j.institution,
    description:   j.description,
    source_url:    j.source_url,
    source_site:   j.source_site,
    source_name:   j.source_name,
    scraped_at:    j.scraped_at,
    deadline:      j.deadline,
    status:        j.status,
    categories:    j.categories     || [],
    subjects:      j.subjects       || [],
    states:        j.states         || [],
    cities:        j.cities         || [],
    ownership:     j.ownership,
    employmentType:j.employment_type,
    academicLevel: j.academic_level,
    salaryMin:     j.salary_min,
    salaryMax:     j.salary_max,
    vacancies:     j.vacancies,
  };
}

// ─── CUSTOM SOURCES ────────────────────────────────────────────────────────

export async function dbFetchCustomSources() {
  const { data, error } = await supabase
    .from("custom_sources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function dbInsertCustomSource(src) {
  const { data, error } = await supabase
    .from("custom_sources")
    .insert({
      id:           src.id,
      url:          src.url,
      name:         src.name,
      icon:         src.icon,
      category:     src.category,
      notes:        src.notes,
      added_date:   src.addedDate,
      fetch_status: "never",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function dbDeleteCustomSource(id) {
  const { error } = await supabase.from("custom_sources").delete().eq("id", id);
  if (error) throw error;
}

export async function dbUpdateCustomSource(id, patch) {
  const { error } = await supabase.from("custom_sources").update(patch).eq("id", id);
  if (error) throw error;
}

export async function dbUpdateCustomSourceFetch(url, count, status) {
  const { error } = await supabase.from("custom_sources").update({
    last_fetched_count: count,
    last_fetched_at:    new Date().toISOString(),
    fetch_status:       status,
  }).eq("url", url);
  if (error) throw error;
}
