import CampaignComposer, { type Campaign } from "../campaign-composer";

const empty: Campaign = {
  id: null,
  subject: "",
  body_md: "",
  preheader: null,
  status: "draft",
  recipient_count: 0,
  sent_count: 0,
  failed_count: 0,
  sent_at: null,
};

export default function NewCampaignPage() {
  return <CampaignComposer initial={empty} />;
}
