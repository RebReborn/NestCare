'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  User, Loader2, Save, ExternalLink, ShieldCheck, DollarSign, Baby, Heart, 
  Pencil, X, Check, Camera, Mail, Calendar, CreditCard, Image as ImageIcon,
  Plus, Trash2, Clock, Sparkles, MapPin, Navigation, Info, Phone, AlertTriangle,
  FileText, MessageCircle, Home, HeartHandshake, Stethoscope, ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PaymentMethodsModal } from '@/components/payments/payment-methods-modal';
import LocationAutocompleteInput from '@/components/location/location-autocomplete-input';
import { geocodeLocation } from '@/lib/location/geocoder';

const SERVICES = ['In-home Babysitting', 'Overnight Care', 'After-school Pickup', 'Daycare Pickup', 'Weekend Care', 'Emergency Care'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Mandarin', 'American Sign Language'];
const AGE_GROUPS = ['Infant (0-1 yrs)', 'Toddler (1-3 yrs)', 'Preschool (3-5 yrs)', 'School-Age (5-12 yrs)', 'Teen (13+ yrs)'];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<'parent' | 'sitter' | 'admin' | null>(null);
  const [userEmail, setUserEmail] = useState('');

  // Edit Mode Toggles
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingPro, setIsEditingPro] = useState(false);
  const [isEditingGallery, setIsEditingGallery] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Shared Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Draft states for Basic Info
  const [draftFirstName, setDraftFirstName] = useState('');
  const [draftLastName, setDraftLastName] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [draftAvatarUrl, setDraftAvatarUrl] = useState('');

  // Location fields
  const [serviceArea, setServiceArea] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [serviceLatitude, setServiceLatitude] = useState<number | null>(null);
  const [serviceLongitude, setServiceLongitude] = useState<number | null>(null);
  const [serviceRadiusKm, setServiceRadiusKm] = useState(15);
  const [travelToParent, setTravelToParent] = useState(true);
  const [acceptDropoff, setAcceptDropoff] = useState(false);

  // Sitter-specific profile fields
  const [headline, setHeadline] = useState('');
  const [hourlyRate, setHourlyRate] = useState(18);
  const [yearsExperience, setYearsExperience] = useState(0);
  const [maxChildren, setMaxChildren] = useState(3);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [galleryUrls, setGalleryUrls] = useState<string[]>(['']);
  const [additionalChildRate, setAdditionalChildRate] = useState(5);
  const [pricingModel, setPricingModel] = useState<'flat' | 'additional_child' | 'per_child'>('flat');
  const [coverUrl, setCoverUrl] = useState('');
  const [minimumNoticeHours, setMinimumNoticeHours] = useState(0);
  const [availRules, setAvailRules] = useState<any[]>([]);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState('');

  // Parent Specific fields
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [houseRules, setHouseRules] = useState('');
  const [petsInfo, setPetsInfo] = useState('');
  const [savedSitters, setSavedSitters] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);

  // Parent Home Location fields
  const [parentHomeArea, setParentHomeArea] = useState('');
  const [parentCity, setParentCity] = useState('');
  const [parentProvince, setParentProvince] = useState('');
  const [parentLat, setParentLat] = useState<number | null>(null);
  const [parentLng, setParentLng] = useState<number | null>(null);
  const [isEditingParentLocation, setIsEditingParentLocation] = useState(false);

  // Child modal state
  const [showChildModal, setShowChildModal] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [childFirstName, setChildFirstName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childAgeGroup, setChildAgeGroup] = useState('Toddler (1-3 yrs)');
  const [childAllergies, setChildAllergies] = useState('');
  const [childMedications, setChildMedications] = useState('');
  const [childInstructions, setChildInstructions] = useState('');
  const [savingChild, setSavingChild] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserId(user.id);
        setUserEmail(user.email || '');

        // Fetch profile
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (prof) {
          setRole(prof.role);
          setFirstName(prof.first_name || '');
          setLastName(prof.last_name || '');
          setBio(prof.bio || '');
          setAvatarUrl(prof.avatar_url || '');

          setDraftFirstName(prof.first_name || '');
          setDraftLastName(prof.last_name || '');
          setDraftBio(prof.bio || '');
          setDraftAvatarUrl(prof.avatar_url || '');

          setEmergencyContactName(prof.emergency_contact_name || '');
          setEmergencyContactPhone(prof.emergency_contact_phone || '');
          setHouseRules(prof.house_rules || '');
          setPetsInfo(prof.pets_info || '');

          if (prof.role === 'sitter') {
            const { data: sitterDetails } = await supabase
              .from('sitter_profiles')
              .select(`
                headline,
                base_hourly_rate_cents,
                additional_child_rate_cents,
                pricing_model,
                years_experience,
                max_children,
                minimum_notice_hours,
                gallery_urls,
                cover_url,
                city,
                province,
                service_area,
                service_latitude,
                service_longitude,
                service_radius_km,
                travel_to_parent,
                accept_dropoff,
                sitter_services(service_type),
                sitter_languages(language)
              `)
              .eq('id', user.id)
              .maybeSingle();

            if (sitterDetails) {
              setHeadline(sitterDetails.headline || '');
              setHourlyRate(sitterDetails.base_hourly_rate_cents ? Math.round(Number(sitterDetails.base_hourly_rate_cents) / 100) : 18);
              setAdditionalChildRate(sitterDetails.additional_child_rate_cents ? Math.round(Number(sitterDetails.additional_child_rate_cents) / 100) : 5);
              setPricingModel((sitterDetails.pricing_model || 'flat') as any);
              setYearsExperience(sitterDetails.years_experience || 0);
              setMaxChildren(sitterDetails.max_children || 3);
              setMinimumNoticeHours(sitterDetails.minimum_notice_hours || 0);
              
              setCity(sitterDetails.city || 'Vancouver');
              setProvince(sitterDetails.province || 'BC');
              setServiceArea(sitterDetails.service_area || sitterDetails.city || '');
              setServiceLatitude(sitterDetails.service_latitude || prof.location_lat || null);
              setServiceLongitude(sitterDetails.service_longitude || prof.location_lng || null);
              setServiceRadiusKm(sitterDetails.service_radius_km || 15);
              setTravelToParent(sitterDetails.travel_to_parent ?? true);
              setAcceptDropoff(sitterDetails.accept_dropoff ?? false);

              const sList = (sitterDetails as any).sitter_services?.map((s: any) => s.service_type) || [];
              const lList = (sitterDetails as any).sitter_languages?.map((l: any) => l.language) || [];
              setSelectedServices(sList);
              setSelectedLanguages(lList);

              const urls = sitterDetails.gallery_urls || [];
              setGalleryUrls(urls.length > 0 ? urls : ['']);
              setCoverUrl(sitterDetails.cover_url || '');
            }

            // Fetch availability rules
            const { data: rules } = await supabase
              .from('availability_rules')
              .select('*')
              .eq('sitter_id', user.id);
            setAvailRules(rules || []);

            // Fetch Stripe Connect account status
            const { data: stAcc } = await supabase
              .from('stripe_accounts')
              .select('*')
              .eq('profile_id', user.id)
              .maybeSingle();

            if (stAcc && (stAcc.onboarding_completed || stAcc.stripe_connect_id)) {
              setStripeConnected(true);
              setStripeAccountId(stAcc.stripe_connect_id);
            }

          } else if (prof.role === 'parent') {
            // Load parent home location from profiles
            setParentLat(prof.location_lat || null);
            setParentLng(prof.location_lng || null);
            // Try to reverse-geocode stored coordinates into a human-readable address
            if (prof.location_lat && prof.location_lng) {
              import('@/lib/location/geocoder').then(({ reverseGeocodeLocation }) => {
                reverseGeocodeLocation(prof.location_lat, prof.location_lng).then((r) => {
                  if (r) {
                    setParentHomeArea(r.displayName || r.city || '');
                    setParentCity(r.city || '');
                    setParentProvince(r.province || '');
                  }
                });
              });
            }

            // Fetch children
            const { data: kids } = await supabase
              .from('children')
              .select('*')
              .eq('parent_id', user.id)
              .order('created_at', { ascending: true });
            setChildren(kids || []);

            // Fetch favorite sitters
            const { data: favs } = await supabase
              .from('favorites')
              .select(`
                sitter_id,
                sitter:sitter_profiles(
                  id,
                  base_hourly_rate_cents,
                  years_experience,
                  city,
                  profile:profiles(
                    display_name,
                    avatar_url
                  )
                )
              `)
              .eq('parent_id', user.id);

            const mappedFavs = (favs || []).map((f: any) => {
              const s = f.sitter;
              return {
                id: s?.id || f.sitter_id,
                name: s?.profile?.display_name || 'Caregiver',
                avatar_url: s?.profile?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
                hourly_rate: s?.base_hourly_rate_cents ? Math.round(Number(s.base_hourly_rate_cents) / 100) : 22,
                years_experience: s?.years_experience || 2,
                city: s?.city || 'Vancouver',
              };
            });
            setSavedSitters(mappedFavs);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSaveBasicInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      setSaving(true);
      const displayInitial = draftLastName ? `${draftLastName[0]}.` : '';
      const newDisplayName = `${draftFirstName} ${displayInitial}`.trim();

      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          first_name: draftFirstName,
          last_name: draftLastName,
          display_name: newDisplayName,
          bio: draftBio,
          avatar_url: draftAvatarUrl,
        })
        .eq('id', userId);

      if (profErr) throw profErr;

      setFirstName(draftFirstName);
      setLastName(draftLastName);
      setBio(draftBio);
      setAvatarUrl(draftAvatarUrl);
      setIsEditingBasic(false);

      toast.success('Basic profile information updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update basic info.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmergencyContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      setSaving(true);
      const { error: err } = await supabase
        .from('profiles')
        .update({
          emergency_contact_name: emergencyContactName,
          emergency_contact_phone: emergencyContactPhone,
          house_rules: houseRules,
          pets_info: petsInfo,
        })
        .eq('id', userId);

      if (err) throw err;
      setIsEditingEmergency(false);
      toast.success('Emergency contact & house details updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update emergency details.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveParentLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      setSaving(true);

      const updatePayload: any = {};
      if (parentLat && parentLng) {
        updatePayload.location_lat = parentLat;
        updatePayload.location_lng = parentLng;
      }

      const { error: err } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);

      if (err) throw err;
      setIsEditingParentLocation(false);
      toast.success('Home location saved! Your searches will now be centred around your neighbourhood.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save home location.');
    } finally {
      setSaving(false);
    }
  };

  const openAddChildModal = () => {
    setEditingChildId(null);
    setChildFirstName('');
    setChildDob('');
    setChildAgeGroup('Toddler (1-3 yrs)');
    setChildAllergies('');
    setChildMedications('');
    setChildInstructions('');
    setShowChildModal(true);
  };

  const openEditChildModal = (child: any) => {
    setEditingChildId(child.id);
    setChildFirstName(child.first_name || '');
    setChildDob(child.date_of_birth || '');
    setChildAgeGroup(child.age_group || 'Toddler (1-3 yrs)');
    setChildAllergies(child.allergies || '');
    setChildMedications(child.medications || '');
    setChildInstructions(child.special_instructions || '');
    setShowChildModal(true);
  };

  const handleSaveChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !childFirstName.trim()) return;

    try {
      setSavingChild(true);
      const payload: any = {
        parent_id: userId,
        first_name: childFirstName.trim(),
        date_of_birth: childDob || null,
        age_group: childAgeGroup,
        allergies: childAllergies.trim() || null,
        medications: childMedications.trim() || null,
        special_instructions: childInstructions.trim() || null,
      };

      if (editingChildId) {
        const { error: err } = await supabase
          .from('children')
          .update(payload)
          .eq('id', editingChildId);

        if (err) throw err;
        setChildren(prev => prev.map(c => c.id === editingChildId ? { ...c, ...payload } : c));
        toast.success(`${childFirstName}'s details updated successfully!`);
      } else {
        const { data: newChild, error: err } = await supabase
          .from('children')
          .insert(payload)
          .select()
          .single();

        if (err) throw err;
        setChildren(prev => [...prev, newChild]);
        toast.success(`Added ${childFirstName} to family profile!`);
      }

      setShowChildModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save child details.');
    } finally {
      setSavingChild(false);
    }
  };

  const handleDeleteChild = async (childId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from your profile?`)) return;
    try {
      const { error: err } = await supabase.from('children').delete().eq('id', childId);
      if (err) throw err;
      setChildren(prev => prev.filter(c => c.id !== childId));
      toast.success(`Removed ${name} from family profile.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove child.');
    }
  };

  const handleRemoveFavorite = async (sitterId: string, name: string) => {
    try {
      const { error: err } = await supabase
        .from('favorites')
        .delete()
        .eq('parent_id', userId)
        .eq('sitter_id', sitterId);

      if (err) throw err;
      setSavedSitters(prev => prev.filter(s => s.id !== sitterId));
      toast.success(`Removed ${name} from your saved sitters.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove saved sitter.');
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      setSaving(true);
      const parts = (serviceArea || '').split(',').map((s) => s.trim());
      const cityVal = city || parts[0] || serviceArea || 'Vancouver';
      const provVal = province || parts[1] || 'BC';

      const updateObj: any = {
        city: cityVal,
        province: provVal,
        service_radius_km: serviceRadiusKm,
        travel_to_parent: travelToParent,
        accept_dropoff: acceptDropoff,
      };

      if (serviceLatitude && serviceLongitude) {
        updateObj.service_latitude = serviceLatitude;
        updateObj.service_longitude = serviceLongitude;

        await supabase.from('profiles').update({
          location_lat: serviceLatitude,
          location_lng: serviceLongitude,
        }).eq('id', userId);
      }

      if (role === 'sitter') {
        const { error: err } = await supabase
          .from('sitter_profiles')
          .update(updateObj)
          .eq('id', userId);
        if (err) throw err;
      }

      setIsEditingLocation(false);
      toast.success('Household location updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update location.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-[11px] font-bold text-primary mb-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            {role === 'parent' ? 'Verified NestCare Family' : 'NestCare Professional Sitter'}
          </div>
          <h1 className="font-display text-2xl font-black text-heading dark:text-white">
            {role === 'parent' ? 'Family Account & Care Profile' : 'Profile Overview'}
          </h1>
          <p className="text-xs text-stone-400">
            {role === 'parent' 
              ? 'Manage children details, emergency contacts, saved caregivers, and house rules.' 
              : 'Manage your public information and account details.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {role === 'parent' && (
            <button
              onClick={openAddChildModal}
              className="px-4 py-2.5 bg-primary text-white rounded-2xl active-press hover:bg-emerald-800 flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="h-4 w-4" /> Add Child
            </button>
          )}
          {role === 'sitter' && (
            <button
              onClick={() => router.push(`/sitter/${userId}`)}
              className="px-4 py-2.5 bg-emerald-50 text-primary dark:bg-emerald-950/50 dark:text-emerald-300 rounded-2xl active-press hover:bg-emerald-100 flex items-center gap-1.5 text-xs font-bold transition-all"
            >
              <ExternalLink className="h-4 w-4" /> View Public Profile
            </button>
          )}
          <button
            onClick={() => {
              toast.success('Profile changes saved!');
              router.push('/dashboard');
            }}
            className="px-4 py-2.5 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-200 rounded-2xl active-press hover:bg-stone-200 flex items-center gap-1.5 text-xs font-bold transition-all"
          >
            <Save className="h-4 w-4" /> Save & Exit
          </button>
        </div>
      </div>

      {/* ============================================================
         1. BASIC INFORMATION CARD (Parent & Sitter)
         ============================================================ */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs transition-all">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4 mb-4">
          <h2 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> 
            {role === 'parent' ? 'Parent & Household Profile' : 'Basic Information'}
          </h2>

          {!isEditingBasic ? (
            <button
              type="button"
              onClick={() => {
                setDraftFirstName(firstName);
                setDraftLastName(lastName);
                setDraftBio(bio);
                setDraftAvatarUrl(avatarUrl);
                setIsEditingBasic(true);
              }}
              className="px-3.5 py-1.5 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-stone-50 dark:hover:bg-slate-800 active-press transition-colors flex items-center gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Basic Info
            </button>
          ) : (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
              Editing Mode
            </span>
          )}
        </div>

        {!isEditingBasic ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                alt={`${firstName} ${lastName}`}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-stone-200 dark:border-slate-700 shadow-2xs"
              />
              <div>
                <h3 className="font-bold text-base text-heading dark:text-white">{firstName} {lastName}</h3>
                <p className="text-xs text-stone-500 dark:text-slate-400">{userEmail}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block px-2.5 py-0.5 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                    Role: {role === 'parent' ? 'Family Parent' : role}
                  </span>
                  {(role === 'parent' ? (parentCity || parentHomeArea) : city) && (
                    <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                      {role === 'parent'
                        ? `${parentCity || parentHomeArea.split(',')[0]}${parentProvince ? ', ' + parentProvince : ''}`
                        : `${city}${province ? ', ' + province : ''}`
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider mb-1">
                {role === 'parent' ? 'About Our Family' : 'Biography / About Me'}
              </h4>
              <p className="text-xs text-stone-700 dark:text-slate-200 leading-relaxed font-medium">
                {bio || <span className="text-stone-400 italic">No family overview provided yet. Click 'Edit Basic Info' to share info with caregivers.</span>}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveBasicInfo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={draftFirstName}
                  onChange={(e) => setDraftFirstName(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={draftLastName}
                  onChange={(e) => setDraftLastName(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Avatar / Profile Photo URL</label>
              <input
                type="url"
                value={draftAvatarUrl}
                onChange={(e) => setDraftAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                {role === 'parent' ? 'About Our Family' : 'About Me / Biography'}
              </label>
              <textarea
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                rows={4}
                placeholder={role === 'parent' ? 'Tell sitters about your family, kids, interests, and home environment...' : 'Tell families about your background...'}
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save Basic Info</>}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingBasic(false)}
                className="px-5 py-3 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 text-xs font-bold rounded-2xl hover:bg-stone-200 active-press transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ============================================================
         PARENTS EXCLUSIVE SECTION 1: CHILDREN & FAMILY MEMBERS CARD
         ============================================================ */}
      {role === 'parent' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                <Baby className="h-5 w-5 text-primary" /> Children & Family Members
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Manage your children's profiles, age groups, allergies, and care notes.</p>
            </div>
            <button
              onClick={openAddChildModal}
              className="px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 active-press transition-all flex items-center gap-1 shrink-0 shadow-2xs"
            >
              <Plus className="h-4 w-4" /> Add Child
            </button>
          </div>

          {children.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 dark:bg-slate-800/50 border border-dashed border-stone-200 dark:border-slate-700 rounded-2xl space-y-3">
              <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary">
                <Baby className="h-8 w-8" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-heading dark:text-white">No Children Profiles Added Yet</h4>
                <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                  Adding your children's details helps caregivers prepare dietary preferences, allergy precautions, and age-appropriate routines.
                </p>
              </div>
              <button
                onClick={openAddChildModal}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-emerald-800 active-press transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add First Child Profile
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {children.map((child) => (
                <div key={child.id} className="p-4 bg-stone-50 dark:bg-slate-800/80 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-2.5 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl text-primary border border-stone-200 dark:border-slate-700 shadow-2xs">
                        <Baby className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-heading dark:text-white">{child.first_name}</h4>
                        <span className="inline-block px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold rounded-md">
                          {child.age_group || 'Child'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditChildModal(child)}
                        className="p-1.5 text-stone-400 hover:text-primary transition-colors"
                        title="Edit child"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteChild(child.id, child.first_name)}
                        className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                        title="Delete child"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-stone-600 dark:text-slate-300 font-medium">
                    {child.date_of_birth && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="h-3.5 w-3.5 text-stone-400" />
                        <span>DOB: {child.date_of_birth}</span>
                      </div>
                    )}
                    {child.allergies && (
                      <div className="p-2 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/60 rounded-xl text-red-800 dark:text-red-300 text-[11px] flex items-start gap-1.5 font-bold">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-600" />
                        <span>Allergies: {child.allergies}</span>
                      </div>
                    )}
                    {child.medications && (
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl text-blue-800 dark:text-blue-300 text-[11px] flex items-start gap-1.5 font-bold">
                        <Stethoscope className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-600" />
                        <span>Meds: {child.medications}</span>
                      </div>
                    )}
                    {child.special_instructions && (
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-xl border border-stone-100 dark:border-slate-800">
                        💬 {child.special_instructions}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
         PARENTS EXCLUSIVE SECTION 2: EMERGENCY CONTACTS & HOUSE DETAILS
         ============================================================ */}
      {role === 'parent' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-600" /> Emergency Contact & Household Instructions
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Contact details and house rules shared securely with confirmed sitters.</p>
            </div>
            {!isEditingEmergency ? (
              <button
                onClick={() => setIsEditingEmergency(true)}
                className="px-3.5 py-1.5 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-stone-50 dark:hover:bg-slate-800 active-press transition-colors flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Emergency Details
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                Editing Mode
              </span>
            )}
          </div>

          {!isEditingEmergency ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-100 dark:border-slate-800 space-y-1.5">
                <span className="font-bold text-stone-400 uppercase tracking-wider text-[10px] block">Primary Emergency Contact</span>
                <span className="font-extrabold text-heading dark:text-white block text-sm">
                  {emergencyContactName || <span className="text-stone-400 italic">Not set</span>}
                </span>
                <span className="text-stone-600 dark:text-slate-300 font-medium block">
                  📞 {emergencyContactPhone || 'No phone provided'}
                </span>
              </div>

              <div className="p-4 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-100 dark:border-slate-800 space-y-1.5">
                <span className="font-bold text-stone-400 uppercase tracking-wider text-[10px] block">Pets & Household Info</span>
                <span className="text-stone-700 dark:text-slate-200 font-medium block">
                  🐾 Pets: {petsInfo || 'None specified'}
                </span>
                <span className="text-stone-500 dark:text-slate-400 text-[11px] block">
                  📋 Rules: {houseRules || 'Standard NestCare house safety rules apply.'}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveEmergencyContact} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="e.g. Grandma Mary / Doctor Smith"
                    className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="+1 (555) 019-2831"
                    className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Pets Information</label>
                <input
                  type="text"
                  value={petsInfo}
                  onChange={(e) => setPetsInfo(e.target.value)}
                  placeholder="e.g. 1 friendly Golden Retriever (Luna), 1 indoor cat"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Household Rules & Entry Instructions</label>
                <textarea
                  value={houseRules}
                  onChange={(e) => setHouseRules(e.target.value)}
                  rows={3}
                  placeholder="e.g. Wi-Fi code, bedtime routines, screen time limits, keyless door code..."
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save Emergency Details</>}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingEmergency(false)}
                  className="px-5 py-3 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 text-xs font-bold rounded-2xl hover:bg-stone-200 active-press transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ============================================================
         PARENTS EXCLUSIVE SECTION 3: SAVED CAREGIVERS & FAVORITES
         ============================================================ */}
      {role === 'parent' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500 fill-red-500" /> Saved Caregivers & Favorites
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Quick access to your preferred, bookmarked sitters.</p>
            </div>
            <button
              onClick={() => router.push('/search')}
              className="px-3.5 py-1.5 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-stone-50 dark:hover:bg-slate-800 active-press transition-all flex items-center gap-1 shrink-0"
            >
              Browse Sitters <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {savedSitters.length === 0 ? (
            <div className="p-6 text-center bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-100 dark:border-slate-800 space-y-2">
              <p className="text-xs text-stone-400 font-medium">You haven't saved any caregivers yet. Click the heart icon on any sitter's card to bookmark them for easy repeat booking.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {savedSitters.map((sitter) => (
                <div key={sitter.id} className="p-4 bg-stone-50 dark:bg-slate-800/70 rounded-2xl border border-stone-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={sitter.avatar_url}
                      alt={sitter.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-heading dark:text-white">{sitter.name}</h4>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 font-semibold">${sitter.hourly_rate}/hr • {sitter.city}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => router.push(`/sitter/${sitter.id}`)}
                      className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-xl hover:bg-emerald-800 active-press transition-colors"
                    >
                      Book
                    </button>
                    <button
                      onClick={() => handleRemoveFavorite(sitter.id, sitter.name)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Remove from favorites"
                    >
                      <Heart className="h-4 w-4 fill-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
         PARENTS EXCLUSIVE SECTION 4: SAVED PAYMENT METHODS
         ============================================================ */}
      {role === 'parent' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3 gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-teal-600" /> Payment & Billing Methods
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Manage credit cards on file for seamless booking authorizations.</p>
            </div>

            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2.5 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-emerald-800 active-press transition-all flex items-center gap-1.5 shadow-2xs shrink-0"
            >
              <CreditCard className="h-4 w-4" />
              <span>Manage Payment Methods</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
         PARENTS EXCLUSIVE SECTION 5: HOME LOCATION
         ============================================================ */}
      {role === 'parent' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" /> Home Location
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Set your home location so sitter searches are automatically centred on your neighbourhood.
              </p>
            </div>
            {!isEditingParentLocation ? (
              <button
                type="button"
                onClick={() => setIsEditingParentLocation(true)}
                className="px-3.5 py-1.5 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-stone-50 dark:hover:bg-slate-800 active-press transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Pencil className="h-3.5 w-3.5" /> {parentLat ? 'Update Location' : 'Set Location'}
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg shrink-0">
                Editing
              </span>
            )}
          </div>

          {!isEditingParentLocation ? (
            <div>
              {parentLat && parentLng ? (
                <div className="flex items-center justify-between p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Navigation className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-sm text-heading dark:text-white block">
                        {parentHomeArea || `${parentCity}${parentProvince ? ', ' + parentProvince : ''}`}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        GPS: {parentLat.toFixed(4)}, {parentLng.toFixed(4)} · Used to pre-fill search location
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold rounded-full text-[10px]">
                    ✅ Set
                  </span>
                </div>
              ) : (
                <div className="p-5 text-center bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-stone-200 dark:border-slate-700 space-y-2">
                  <div className="inline-flex p-2.5 bg-primary/10 rounded-xl text-primary">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">
                    No home location set yet. Set it so search results always start from your neighbourhood.
                  </p>
                  <button
                    onClick={() => setIsEditingParentLocation(true)}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-emerald-800 active-press inline-flex items-center gap-1.5"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Set Home Location
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveParentLocation} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                  Search Your Home Address or Neighbourhood
                </label>
                <LocationAutocompleteInput
                  value={parentHomeArea}
                  onChange={(val) => setParentHomeArea(val)}
                  onSelectSuggestion={(sugg) => {
                    setParentHomeArea(sugg.address);
                    setParentCity(sugg.city || sugg.address.split(',')[0]);
                    setParentProvince(sugg.province || '');
                    setParentLat(sugg.latitude);
                    setParentLng(sugg.longitude);
                  }}
                  onLocationCommit={(locName) => {
                    geocodeLocation(locName).then(results => {
                      if (results.length > 0) {
                        setParentLat(results[0].latitude);
                        setParentLng(results[0].longitude);
                        setParentCity(results[0].city || results[0].displayName.split(',')[0]);
                        setParentProvince(results[0].province || '');
                      }
                    });
                  }}
                  placeholder="e.g. Kitsilano, Vancouver or 123 Main St..."
                />
              </div>

              {parentLat && parentLng && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                  📍 Location pinned: {parentHomeArea || parentCity} ({parentLat.toFixed(4)}, {parentLng.toFixed(4)})
                </div>
              )}

              <p className="text-[11px] text-stone-400 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Your exact address is never shared publicly. Only approximate distances are shown to sitters.
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving || !parentLat}
                  className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save Home Location</>}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingParentLocation(false)}
                  className="px-5 py-3 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 text-xs font-bold rounded-2xl hover:bg-stone-200 active-press transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ============================================================
         SITTER SPECIFIC SECTIONS: LOCATION & RADIUS
         ============================================================ */}
      {role === 'sitter' && (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-heading dark:text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" /> Service Location & Radius
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Define your primary service city, coordinates, and travel radius.</p>
            </div>
            {!isEditingLocation ? (
              <button
                type="button"
                onClick={() => setIsEditingLocation(true)}
                className="px-3.5 py-1.5 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-stone-50 dark:hover:bg-slate-800 active-press transition-colors flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Location
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                Editing Location
              </span>
            )}
          </div>

          {!isEditingLocation ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Navigation className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-heading dark:text-white block">
                      {city || 'City not set'}{province ? `, ${province}` : ''}{serviceArea && serviceArea !== city ? ` (${serviceArea})` : ''}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {serviceLatitude && serviceLongitude
                        ? `GPS Coordinates: ${serviceLatitude.toFixed(4)}, ${serviceLongitude.toFixed(4)}`
                        : 'Coordinates not set yet — Edit to update'}
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold rounded-full text-[11px]">
                  {serviceRadiusKm} km radius
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Search City or Service Address</label>
                <LocationAutocompleteInput
                  value={serviceArea}
                  onChange={(val) => setServiceArea(val)}
                  onSelectSuggestion={(sugg) => {
                    setServiceArea(sugg.address);
                    setCity(sugg.city || sugg.address.split(',')[0]);
                    setProvince(sugg.province || '');
                    setServiceLatitude(sugg.latitude);
                    setServiceLongitude(sugg.longitude);
                  }}
                  onLocationCommit={(locName) => {
                    geocodeLocation(locName).then(results => {
                      if (results.length > 0) {
                        setServiceLatitude(results[0].latitude);
                        setServiceLongitude(results[0].longitude);
                        setCity(results[0].city || results[0].displayName.split(',')[0]);
                      }
                    });
                  }}
                  placeholder="Type city or address to search..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save Location</>}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingLocation(false)}
                  className="px-5 py-3 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 text-xs font-bold rounded-2xl hover:bg-stone-200 active-press transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ============================================================
         CHILD MANAGEMENT MODAL FOR PARENTS
         ============================================================ */}
      {showChildModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl border border-stone-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <h3 className="font-display font-black text-base text-heading dark:text-white flex items-center gap-2">
                <Baby className="h-5 w-5 text-primary" />
                {editingChildId ? 'Edit Child Profile' : 'Add Child Profile'}
              </h3>
              <button
                onClick={() => setShowChildModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChild} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Child's First Name *</label>
                <input
                  type="text"
                  required
                  value={childFirstName}
                  onChange={(e) => setChildFirstName(e.target.value)}
                  placeholder="e.g. Oliver"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Date of Birth (Optional)</label>
                  <input
                    type="date"
                    value={childDob}
                    onChange={(e) => setChildDob(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Age Group</label>
                  <select
                    value={childAgeGroup}
                    onChange={(e) => setChildAgeGroup(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary font-medium"
                  >
                    {AGE_GROUPS.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Allergies (If any)</label>
                <input
                  type="text"
                  value={childAllergies}
                  onChange={(e) => setChildAllergies(e.target.value)}
                  placeholder="e.g. Peanuts, Dairy, Latex, None"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Medications & Health Notes</label>
                <input
                  type="text"
                  value={childMedications}
                  onChange={(e) => setChildMedications(e.target.value)}
                  placeholder="e.g. EpiPen in kitchen bag, Asthma inhaler"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Bedtime Routines & Special Instructions</label>
                <textarea
                  value={childInstructions}
                  onChange={(e) => setChildInstructions(e.target.value)}
                  rows={3}
                  placeholder="e.g. Bedtime story at 8 PM, loves building blocks, night light on..."
                  className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs bg-stone-50 dark:bg-slate-800 dark:text-white outline-none focus:border-primary resize-none font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingChild}
                  className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5"
                >
                  {savingChild ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> {editingChildId ? 'Update Child Profile' : 'Add Child Profile'}</>}
                </button>
                <button
                  type="button"
                  onClick={() => setShowChildModal(false)}
                  className="px-5 py-3 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 text-xs font-bold rounded-2xl hover:bg-stone-200 active-press transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment methods modal */}
      {showPaymentModal && (
        <PaymentMethodsModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}
