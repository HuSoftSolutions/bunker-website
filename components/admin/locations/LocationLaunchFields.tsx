import { Field, Label, Description } from "@/ui-kit/fieldset";
import { Input } from "@/ui-kit/input";
import { Switch, SwitchField } from "@/ui-kit/switch";
import { Textarea } from "@/ui-kit/textarea";

export function LocationLaunchFields({ form, onChange }: {
  form: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}) {
  const images = Array.isArray(form.images) ? form.images : [];
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
      <SwitchField>
        <Label>Coming Soon</Label>
        <Description>Show a simplified public listing and hide booking, menus, hours, and other operational details. Turn off when this location opens.</Description>
        <Switch checked={form.comingSoon === true} onChange={(value) => onChange("comingSoon", value)} />
      </SwitchField>
      <Field>
        <Label>City / Region</Label>
        <Input value={typeof form.city === "string" ? form.city : ""} onChange={(e) => onChange("city", e.target.value)} placeholder="Albany, NY" />
      </Field>
      <Field>
        <Label>Opening Message</Label>
        <Textarea value={typeof form.openingMessage === "string" ? form.openingMessage : ""} onChange={(e) => onChange("openingMessage", e.target.value)} placeholder="Opening spring 2027. Stay tuned for updates." rows={3} />
      </Field>
      <Field>
        <Label>Cover Image URL</Label>
        <Description>Optional. Use a public HTTPS image URL.</Description>
        <Input type="url" pattern="https://.*" value={typeof images[0] === "string" ? images[0] : ""} onChange={(e) => onChange("images", [e.target.value, ...images.slice(1)])} placeholder="https://…" />
      </Field>
    </div>
  );
}
